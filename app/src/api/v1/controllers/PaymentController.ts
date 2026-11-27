import { Request, Response } from 'express';
import { BaseAuthController } from "@src/api/v1/controllers/BaseAuthController";
import { UserPaymentOrderStatus } from "@config/database/vo/UserPaymentOrderStatus";
import {PaymentControllerInjection} from "@src/api/v1/injection/PaymentControllerInjection";
import EventData, {EventType} from "@src/services/queue/EventData";
import logger from '@src/util/logger';
import { AppError } from '@src/errors/AppError';
import { CartManager } from '@src/services/cart/CartManager';
import { SigningKeys } from '@src/services/security/SigningKeys';
import { verifyCart, moneyMinor, addressFingerprint } from '@src/services/security/HmacProtocol';
import { PaymentAttempt, AttemptSnapshot } from '@src/services/security/PaymentAttempt';
import { ValidationError } from '@src/errors/ValidationError';
import UserData from '@src/services/base/UserData';
import { PaymentType } from '@src/services/payment/Payment';
import { Transaction, UniqueConstraintError } from 'sequelize';

export class PaymentController extends BaseAuthController {

    private readonly inject: PaymentControllerInjection;

    constructor(inject: PaymentControllerInjection) {
        super(inject.token, inject.userDomainValidation);
        this.inject = inject;
    }

    postPayment = async (req: Request, res: Response) => {
        try {
            if (!await this.validateRedisConnection(res)) return;

            this.inject.paymentControllerValidation.validateRequest(req);

            const user = await this.validate(req);

            const domainId = this.inject.userDomainValidation.resolve(user, req).id;
            const requestData = new UserData().set(req).get();
            const signing = await new SigningKeys().find(domainId, 'cart');
            let cartItems = req.body.cartItems;
            let authorizationId: string | undefined;
            if (signing?.enabled) {
                const host = new URL(req.get('referer') ?? '').host.toLowerCase();
                const authorization = verifyCart(req.body.cartAuthorization, signing, String(user.get('code')), host);
                if (authorization.addressHash &&
                    authorization.addressHash !== addressFingerprint(req.body.addressItems)) {
                    throw new ValidationError('Checkout address differs from the store authorization');
                }
                if (req.body.shippingMethods.some((method: { currency?: string } | null) =>
                    method?.currency !== authorization.currency)) {
                    throw new ValidationError('Shipping currency differs from the authorized cart');
                }
                authorizationId = authorization.authorizationId;
                const authorized = authorization.items.map(item => ({
                    id: item.id, title: item.title, price: item.priceMinor / 100,
                    currency: authorization.currency, quantity: item.quantity, image: item.image, url: item.url,
                }));
                if (cartItems.length !== authorized.length || authorized.some((item, index) => {
                    const sent = cartItems[index];
                    return !sent || sent.id !== item.id || sent.quantity !== item.quantity ||
                        sent.currency !== item.currency || moneyMinor(sent.price) !== moneyMinor(item.price);
                })) {
                    throw new ValidationError('Cart differs from the store authorization; refresh and review it');
                }
                cartItems = authorized;
            } else if (req.body.cartAuthorization) {
                throw new ValidationError('Cart signing is not enabled for this domain');
            }
            const cartManager = await new CartManager().get(user, cartItems, Boolean(authorizationId));
            const addressItemsJson = JSON.stringify(req.body.addressItems);
            const shippingManager = await this.inject.shippingManager.get(
                user,
                domainId,
                req.body.shippingMethods,
                cartManager.getAmount(),
            );
            const paymentManager = this.inject.paymentManager.get(user, req.body.paymentCode, requestData);

            const totalAmount = authorizationId
                ? (moneyMinor(cartManager.getAmount()) + moneyMinor(shippingManager.getAmount())) / 100
                : cartManager.getAmount() + shippingManager.getAmount();
            if (authorizationId && moneyMinor(totalAmount) > 999999999999) {
                throw new ValidationError('Authorized payment total is outside supported limits');
            }
            const shippingItemsJson = shippingManager.getItemsJson();
            const parameters = {
                cartItems: cartManager.getCartItems(),
                currency: cartManager.getCurrency(),
                amount: totalAmount,
                paymentToken: paymentManager.getPaymentToken(),
                cancelUrl: paymentManager.getCancelUrl(paymentManager.getPaymentType()),
                returnUrl: paymentManager.getReturnUrl(paymentManager.getPaymentType()),
                host: paymentManager.getHost(),
                callbackUrl: paymentManager.getCallbackUrl()
            };
            const create = async (idempotencyKey?: string): Promise<AttemptSnapshot> => {
                const providerRequest = this.inject.paymentFactory.getProviderRequest(paymentManager.getPaymentType());
                await providerRequest.setParameters({ ...parameters, idempotencyKey });
                await providerRequest.createOrder();
                const base = await providerRequest.getResultRedirectUrl();
                return {
                    providerId: providerRequest.getOrderId(),
                    providerMetadata: providerRequest.getMetadata(),
                    redirectUrl: `${base}${base.includes('?') ? '&' : '?'}method=${encodeURIComponent(paymentManager.getPaymentType())}`,
                    userPaymentMethodId: paymentManager.getUserPaymentMethodId(),
                    cartItems: cartManager.getCartItemsJson(),
                    addressItems: addressItemsJson,
                    amount: totalAmount,
                    shippingDetails: shippingItemsJson,
                    description: req.body.description ?? '',
                };
            };
            const persist = async (
                initialSnapshot: AttemptSnapshot,
                linkOrder?: (orderId: number, transaction?: Transaction) => Promise<void>,
                linkedOrderId?: number | null,
                replaceSnapshot?: (snapshot: AttemptSnapshot) => Promise<void>,
            ): Promise<AttemptSnapshot> => {
                let snapshot = initialSnapshot;
                for (let attempt = 0; ; attempt++) {
                    try {
                        await paymentManager.saveOrderOnce(snapshot.providerId, {
                            ...snapshot, userDomainId: domainId, status: UserPaymentOrderStatus.PENDING.Value,
                        }, linkedOrderId, linkOrder);
                        break;
                    } catch (error) {
                        const collision = error instanceof UniqueConstraintError &&
                            error.errors.some(item => item.path === 'providerId' ||
                                item.path === 'userPaymentOrders_providerId_unique');
                        if (!collision || paymentManager.getPaymentType() !== PaymentType.TRANSFER ||
                            linkedOrderId != null || attempt >= 29) throw error;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        snapshot = await create();
                        if (replaceSnapshot) await replaceSnapshot(snapshot);
                    }
                }
                const id = await this.inject.redisManager.queueEvent(
                    new EventData(
                        'postPayment',
                        snapshot.providerId,
                        EventType.postPayment,
                    ),
                );
                logger.info({ redisId: id }, 'Event sent to redis');
                return snapshot;
            };
            const requestSnapshot = {
                paymentCode: req.body.paymentCode, parameters, addressItems: req.body.addressItems,
                shippingMethods: req.body.shippingMethods, description: req.body.description ?? '',
            };
            let data: string;
            if (authorizationId) {
                data = await PaymentAttempt.run(domainId, authorizationId, requestSnapshot, create, persist);
            } else {
                const snapshot = await persist(await create());
                data = snapshot.redirectUrl;
            }

            /**
             * data examples:
             *
             * redsys (card/bizum): URL del TPV Redsys con params por GET que el frontend reenviará por POST
             *   "https://sis-t.redsys.es:25443/sis/realizarPago?Ds_SignatureVersion=HMAC_SHA256_V1&Ds_MerchantParameters=eyJEU19NRVJDSEFOVF9BTU9VTlQiOiI0NzIiLCJEU19NRVJDSEFOVF9PUkRFUiI6Ijc3ODE1NTQ5NTU1NyIsIkRTX01FUkNIQU5UX01FUkNIQU5UQ09ERSI6Ijk5OTAwODg4MSIsIkRTX01FUkNIQU5UX0NVUlJFTkNZIjoiOTc4IiwiRFNfTUVSQ0hBTlRfVFJBTlNBQ1RJT05UWVBFIjoiMCIsIkRTX01FUkNIQU5UX1RFUk1JTkFMIjoiMSIsIkRTX01FUkNIQU5UX01FUkNIQU5UVVJMIjoiaHR0cHM6Ly91bmdyYXZlZC1pbnRlcmNvcmFjb2lkLWNocmlzdG9wZXIubmdyb2stZnJlZS5kZXYvYXBpL3YxL3BheW1lbnQvY2FsbGJhY2siLCJEU19NRVJDSEFOVF9VUkxPSyI6Imh0dHBzOi8vd3d3LmxhdGllbmRhbmF1dGljYS5lcy9pYS1jaGVja291dC5waHA%2FbWV0aG9kPWNhcmQmc3VjY2Vzcz10cnVlIiwiRFNfTUVSQ0hBTlRfVVJMS08iOiJodHRwczovL3d3dy5sYXRpZW5kYW5hdXRpY2EuZXMvaWEtY2hlY2tvdXQucGhwP21ldGhvZD1jYXJkJmNhbmNlbD10cnVlIiwiRFNfTUVSQ0hBTlRfTUVSQ0hBTlROQU1FIjoid3d3LmxhdGllbmRhbmF1dGljYS5lcyJ9&Ds_Signature=YkYfCtqnb%2FhmR8%2Ff%2FXmA6kMOHdU1wp1hQmiyUhOlcyY%3D&method=card"             *
             *
             * transfer: returnUrl con providerId (timestamp) para identificar el pedido y method
             *   "https://www.latiendanautica.es/ia-checkout.php?method=transfer&success=true&providerId=260507120408&method=transfer"
             */

            res.status(200).json({
                success: true,
                data: data,
            });
        } catch (error) {
            logger.error({ err: error }, 'Error in postPayment');
            const appError = error instanceof AppError ? error : null;
            res.status(appError?.status ?? 500).json({
                success: false,
                code: appError?.code ?? 'INTERNAL_ERROR',
                message: appError?.message ?? 'Internal server error',
            });
        }

    };

    callbackPayment = async (req: Request, res: Response) => {
        try {
            if (!await this.validateRedisConnection(res)) return;

            const callback = this.inject.paymentFactory.getProviderCallback(req.body);
            const paymentStatus = await callback.getPaymentStatus();
            if (paymentStatus.status === UserPaymentOrderStatus.COMPLETED) {
                await this.inject.paymentManager.updateOrderStatus(paymentStatus.order, UserPaymentOrderStatus.COMPLETED);
                await this.inject.redisManager.queueEvent(
                    new EventData(
                        'callbackPaymentCompleted',
                        paymentStatus.order,
                        EventType.callbackPayment
                    )
                );
            }
            res.status(200).json({success: true});
        } catch (error) {
            logger.error({ err: error }, 'Error in callbackPayment');
            res.status(500).json({
                success: false,
            });
        }
    };

    validateCallbackPayment = async (req: Request, res: Response) => {
        try {
            this.inject.paymentControllerValidation.validateCallbackPaymentRequest(req);
            await this.inject.paymentManager.validateProviderMetadata(req.body.id, req.body.metadata);
            res.status(200).json({success: true});
        } catch (error) {
            logger.error({ err: error }, 'Error in validateCallbackPayment');
            res.status(500).json({
                success: false,
            });
        }
    }

    private async validateRedisConnection(res: Response): Promise<boolean> {
        if (!await this.inject.redisManager.checkConnection()) {
            res.status(503).json({
                success: false,
                code: 'SERVICE_UNAVAILABLE',
                message: 'Service unavailable. Please try again later.'
            });
            return false;
        }
        return true;
    }
}
