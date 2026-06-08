import db from "@config/database/models";
import {UserStatus} from "@config/database/vo/UserStatus";
import {UserExtended} from "@apptypes/UserExtended";
import { UserAttributes } from "@config/database/models";

export default class UserRepository {
    private User = db.User;

    create(name: string, email: string, password: string, code: string) {
        this.User.create({ name, email, password, code, status: UserStatus.INACTIVE.Value });
    }

    findByEmail(email: string) {
        return this.User.findOne({ where: { email } });
    }

    findById(id: number) {
        return this.User.findByPk(id);
    }

    async updateById(
        id: number,
        data: Partial<Pick<UserAttributes, 'name' | 'code' | 'status'>>
    ): Promise<UserAttributes | null> {
        await (this.User as any).update(data, { where: { id } });
        const result = await this.User.findByPk(id);
        return result ? (result.get({ plain: true }) as UserAttributes) : null;
    }

    /**
     * Buscar un usuario por su código único
     * @param code - código del usuario
     */
    async findByCode(code: string): Promise<UserExtended | null> {
        const result = await this.User.findOne({
            where: {
                code,
                status: 'active'
            },
            include: [
                {
                    model: db.UserDomain,
                    as: 'domains',
                    include: [
                        {
                            model: db.DomainPreferences,
                            as: 'preferences'
                        },
                        {
                            model: db.DomainShipping,
                            as: 'shippingMethods',
                            where: { active: true },
                            required: false // 🔑 importante para no romper si no hay envíos
                        }
                    ]
                },
                {
                    model: db.UserPaymentMethod,
                    as: 'userPaymentMethods',
                    include: [
                        {
                            model: db.PaymentMethod,
                            as: 'paymentMethod',
                            attributes: ['id', 'name', 'code']
                        }
                    ]
                }
            ]
        });

        return result as UserExtended | null;
    }
}
