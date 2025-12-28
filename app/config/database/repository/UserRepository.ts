import db from "@config/database/models";
import {UserStatus} from "@config/database/vo/UserStatus";
import {UserExtended} from "@apptypes/UserExtended";

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
                    as: 'domains'
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
