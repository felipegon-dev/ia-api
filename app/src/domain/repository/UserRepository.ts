import db from "@config/database/models";
import {UserStatus} from "@domain/vo/UserStatus";

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
    findByCode(code: string) {
        return this.User.findOne({
            where: {
                code,
                status: 'active' // solo usuarios activos
            },
            include: [
                {
                    model: db.UserDomain,
                    as: 'domains'
                }
            ]
        });
    }
}
