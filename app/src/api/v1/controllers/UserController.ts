import { Request, Response } from 'express';
import { BaseAuthController } from '@src/api/v1/controllers/BaseAuthController';
import { toUserDTO, UserDTO } from '@src/api/v1/response/dto/UserDTO';
import { UserExtended } from '@apptypes/UserExtended';
import { UserPaymentMethodFactory } from '@src/services/payment/userPaymentMethod/UserPaymentMethodFactory';
import { ACCESSOR_TOKEN } from '@src/services/payment/userPaymentMethod/UserPaymentMethodInterface';
import { PaymentType } from '@src/services/payment/Payment';
import { UnauthorizedError } from '@src/errors/UnauthorizedError';
import UserPaymentOrdersRepository from '@config/database/repository/UserPaymentOrdersRepository';
import logger from '@src/util/logger';

export class UserController extends BaseAuthController {

    constructor(
        token: any,
        userDomainValidation: any,
        private userPaymentMethodFactory?: UserPaymentMethodFactory,
        private userPaymentOrdersRepository?: UserPaymentOrdersRepository
    ) {
        super(token, userDomainValidation);
    }

    getUserById = async (req: Request, res: Response) => {
        try {
            const user: UserExtended = await this.validate(req);
            const total = parseFloat(req.query.total as string) || 0;
            const userDTO: UserDTO = toUserDTO(user, this.userDomainValidation.getUserDomain(), total);
            res.status(200).json({
                success: true,
                data: userDTO
            });
        } catch (error) {
            logger.error({ err: error }, 'Error in getUserById');
            res.status(500).json({
                success: false,
                message: error
            });
        }
    }

    /**
     * GET /api/v1/user/payment-method/:type?providerId=xxx
     *
     * Devuelve IBAN + beneficiario + referencia + total de la orden.
     * providerId es obligatorio para obtener los datos del pedido.
     *
     * Ejemplo de respuesta:
     *   { success: true, data: { iban, issuer, providerId, total, currency } }
     */
    getUserPaymentMethod = async (req: Request, res: Response) => {
        try {
            if (!this.userPaymentMethodFactory || !this.userPaymentOrdersRepository) {
                res.status(500).json({ success: false, message: 'Factory not available' });
                return;
            }
            const user: UserExtended = await this.validate(req);
            const type = req.params.type as PaymentType;

            const handler = this.userPaymentMethodFactory.create(type);

            if (!handler.allowedAccess().get.includes(ACCESSOR_TOKEN)) {
                res.status(403).json({ success: false, message: `Access denied for payment type: ${type}` });
                return;
            }

            const email: string = (user as any).email;
            if (!email) {
                res.status(400).json({ success: false, message: 'User email not found' });
                return;
            }

            const filtered = await handler.getFiltered(email);
            if (!filtered) {
                res.status(404).json({ success: false, message: 'Payment method not configured' });
                return;
            }


            // Obtener datos del pedido si se pasa providerId
            const providerId = req.query.providerId as string | undefined;
            let orderData: { providerId: string; total: number; currency: string } | null = null;

            if (providerId) {
                const order = await this.userPaymentOrdersRepository.findByProviderId(providerId);
                if (order) {
                    const o = order as any;
                    const total = parseFloat(String(o.amount ?? 0)) || 0;

                    orderData = {
                        providerId: o.providerId,
                        total: Math.round(total * 100) / 100,
                        currency: 'EUR',
                    };
                }
            }

            res.status(200).json({ success: true, data: { ...filtered, order: orderData } });

        } catch (error) {
            if (error instanceof UnauthorizedError || (error as any)?.message?.includes('Token') || (error as any)?.message?.includes('Fingerprint') || (error as any)?.message?.includes('encrypted')) {
                res.status(401).json({ success: false, message: 'Unauthorized' });
                return;
            }
            logger.error({ err: error }, 'Error in getUserPaymentMethod');
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
