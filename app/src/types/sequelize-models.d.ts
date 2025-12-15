declare module "@config/database/models" {
    import { Model, Optional, Sequelize } from "sequelize";

    // ----------------- User -----------------
    interface UserAttributes {
        id: number;
        name: string;
        email: string;
        password: string;
        code: string;
        status: 'active' | 'inactive' | 'banned';
        createdAt?: Date;
        updatedAt?: Date;
    }

    interface UserCreationAttributes extends Optional<UserAttributes, "id" | "createdAt" | "updatedAt"> {}

    // ----------------- UserDomain -----------------
    interface UserDomainAttributes {
        id: number;
        userId: number;
        domain: string;
        createdAt?: Date;
        updatedAt?: Date;
    }

    interface UserDomainCreationAttributes extends Optional<UserDomainAttributes, "id" | "createdAt" | "updatedAt"> {}

    // ----------------- Exports -----------------
    export const sequelize: Sequelize;
    export const Sequelize: typeof import("sequelize");

    export const User: typeof Model & {
        new (values?: Partial<UserAttributes>, options?: any): Model<UserAttributes, UserCreationAttributes>;
    };

    export const UserDomain: typeof Model & {
        new (values?: Partial<UserDomainAttributes>, options?: any): Model<UserDomainAttributes, UserDomainCreationAttributes>;
    };

    // ----------------- db object -----------------
    const db: {
        sequelize: Sequelize;
        Sequelize: typeof import("sequelize");
        User: typeof Model & {
            new (values?: Partial<UserAttributes>, options?: any): Model<UserAttributes, UserCreationAttributes>;
        };
        UserDomain: typeof Model & {
            new (values?: Partial<UserDomainAttributes>, options?: any): Model<UserDomainAttributes, UserDomainCreationAttributes>;
        };
    };

    export default db;
}
