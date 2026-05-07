import { Request, Response } from 'express';
import { BaseAuthController } from "@src/api/v1/controllers/BaseAuthController";
import { UserPaymentOrderStatus } from "@config/database/vo/UserPaymentOrderStatus";
import {PaymentControllerInjection} from "@src/api/v1/injection/PaymentControllerInjection";
import EventData, {EventType} from "@src/services/queue/EventData";

export class PaymentController extends BaseAuthController {

    private readonly inject: PaymentControllerInjection;

    constructor(inject: PaymentControllerInjection) {
        super(inject.token, inject.userDomainValidation);
        this.inject = inject;
    }

    postPayment = async (req: Request, res: Response) => {
        try {
            this.validateRedisConnection(res);

            this.inject.paymentControllerValidation.validateRequest(req);

            const user = await this.validate(req);

            const cartManager = await this.inject.cartManager.get(user, req.body.cartItems);
            const addressManager = await this.inject.addressManager.get(user, req.body.addressItems);
            const shippingManager = await this.inject.shippingManager.get(user, this.inject.userDomainValidation.getDomainId(), req.body.shippingMethods);
            const paymentManager = this.inject.paymentManager.get(user, req.body.paymentCode);

            const totalAmount = cartManager.getAmount() + shippingManager.getAmount();

            const providerRequest = this.inject.paymentFactory
                .getProviderRequest(paymentManager.getPaymentType());

            providerRequest.setParameters({
                cartItems: cartManager.getCartItems(),
                currency: cartManager.getCurrency(),
                amount: totalAmount,
                paymentToken: paymentManager.getPaymentToken(),
                cancelUrl: paymentManager.getCancelUrl(paymentManager.getPaymentType()),
                returnUrl: paymentManager.getReturnUrl(paymentManager.getPaymentType()),
                host: paymentManager.getHost(),
                callbackUrl: paymentManager.getCallbackUrl()
            });

            await providerRequest.createOrder();

            await paymentManager.saveOrder({
                userPaymentMethodId: paymentManager.getUserPaymentMethodId(),
                userDomainId: this.inject.userDomainValidation.getDomainId(),
                providerId: providerRequest.getOrderId(),
                providerMetadata: providerRequest.getMetadata(),
                cartItems: cartManager.getCartItemsJson(),
                addressItems: addressManager.getItemsJson(),
                amount: totalAmount,
                status: UserPaymentOrderStatus.PENDING.Value,
                shippingDetails: shippingManager.getItemsJson(),
                description: req.body.description,
            });

            let id = await this.inject.redisManager.queueEvent(
                new EventData(
                    'postPayment',
                    providerRequest.getOrderId(),
                    EventType.postPayment
                )
            );
            console.log('event sent to redis with id:', id);

            const baseUrlWithData = await providerRequest.getResultRedirectUrl();
            const method = paymentManager.getPaymentType();
            const separator = baseUrlWithData.includes('?') ? '&' : '?';

            /**
             * data examples:
             *
             * redsys (card/bizum): URL del TPV Redsys con params por GET que el frontend reenviará por POST
             *   "https://sis-t.redsys.es:25443/sis/realizarPago?Ds_SignatureVersion=HMAC_SHA256_V1&Ds_MerchantParameters=eyJEU19NRVJDSEFOVF9BTU9VTlQiOiI0NzIiLCJEU19NRVJDSEFOVF9PUkRFUiI6Ijc3ODE1NTQ5NTU1NyIsIkRTX01FUkNIQU5UX01FUkNIQU5UQ09ERSI6Ijk5OTAwODg4MSIsIkRTX01FUkNIQU5UX0NVUlJFTkNZIjoiOTc4IiwiRFNfTUVSQ0hBTlRfVFJBTlNBQ1RJT05UWVBFIjoiMCIsIkRTX01FUkNIQU5UX1RFUk1JTkFMIjoiMSIsIkRTX01FUkNIQU5UX01FUkNIQU5UVVJMIjoiaHR0cHM6Ly91bmdyYXZlZC1pbnRlcmNvcmFjb2lkLWNocmlzdG9wZXIubmdyb2stZnJlZS5kZXYvYXBpL3YxL3BheW1lbnQvY2FsbGJhY2siLCJEU19NRVJDSEFOVF9VUkxPSyI6Imh0dHBzOi8vd3d3LmxhdGllbmRhbmF1dGljYS5lcy9pYS1jaGVja291dC5waHA%2FbWV0aG9kPWNhcmQmc3VjY2Vzcz10cnVlIiwiRFNfTUVSQ0hBTlRfVVJMS08iOiJodHRwczovL3d3dy5sYXRpZW5kYW5hdXRpY2EuZXMvaWEtY2hlY2tvdXQucGhwP21ldGhvZD1jYXJkJmNhbmNlbD10cnVlIiwiRFNfTUVSQ0hBTlRfTUVSQ0hBTlROQU1FIjoid3d3LmxhdGllbmRhbmF1dGljYS5lcyJ9&Ds_Signature=YkYfCtqnb%2FhmR8%2Ff%2FXmA6kMOHdU1wp1hQmiyUhOlcyY%3D&method=card"             *
             *
             * transfer: returnUrl con providerId (timestamp) para identificar el pedido y method
             *   "https://www.latiendanautica.es/ia-checkout.php?method=transfer&success=true&providerId=260507120408&method=transfer"
             */
            const data = `${baseUrlWithData}${separator}method=${encodeURIComponent(method)}`;
            console.log(data);

            res.status(200).json({
                success: true,
                data: data,
            });
        } catch (error) {
            console.error('Error in postPayment:', error);
            res.status(500).json({
                success: false,
            });
        }

    };

    callbackPayment = async (req: Request, res: Response) => {
        try {
            this.validateRedisConnection(res);

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
            console.error('Error in callbackPayment:', error);
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
            console.error('Error in validateCallbackPayment:', error);
            res.status(500).json({
                success: false,
            });
        }
    }

    private validateRedisConnection(res: Response): void {
        if (!this.inject.redisManager.checkConnection()) {
            res.status(503).json({
                success: false,
                message: 'Service unavailable. Please try again later.'
            });
        }
    }
}
