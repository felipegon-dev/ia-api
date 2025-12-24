// @config/database/models.d.ts
declare module "@config/database/models" {
    import { Model, Optional, Sequelize, FindOptions } from "sequelize";

    // ----------------- User -----------------
    export type UserAttributes = {
        id: number;
        name: string;
        email: string;
        password: string;
        code: string;
        status: 'active' | 'inactive' | 'banned';
        createdAt?: Date;
        updatedAt?: Date;
    };

    export type UserCreationAttributes = Optional<UserAttributes, "id" | "createdAt" | "updatedAt">;

    // ----------------- UserDomain -----------------
    export type UserDomainAttributes = {
        id: number;
        userId: number;
        domain: string;
        createdAt?: Date;
        updatedAt?: Date;
    };

    export type UserDomainCreationAttributes = Optional<UserDomainAttributes, "id" | "createdAt" | "updatedAt">;

    // ----------------- PaymentMethod -----------------
    export type PaymentMethodAttributes = {
        id: number;
        name: string;
        code: string;
        provider?: string | null;
        apiVersion?: string | null;
        status: 'active' | 'inactive';
        position: number;
        createdAt?: Date;
        updatedAt?: Date;
    };

    export type PaymentMethodCreationAttributes = Optional<
        PaymentMethodAttributes,
        "id" | "provider" | "apiVersion" | "createdAt" | "updatedAt"
    >;

    // ----------------- UserPaymentMethod -----------------
    export type UserPaymentMethodAttributes = {
        id: number;
        userId: number;
        paymentMethodId: number;
        status: 'active' | 'inactive';
        paymentToken?: string | null;
        metadata?: Record<string, any> | null;
        createdAt?: Date;
        updatedAt?: Date;
    };

    export type UserPaymentMethodCreationAttributes = Optional<
        UserPaymentMethodAttributes,
        "id" | "paymentToken" | "metadata" | "createdAt" | "updatedAt"
    >;

    // ----------------- Sequelize Models -----------------
    export const sequelize: Sequelize;
    export const Sequelize: typeof import("sequelize");

    export const User: typeof Model & {
        new (values?: Partial<UserAttributes>, options?: any): Model<UserAttributes, UserCreationAttributes>;
    };

    export const UserDomain: typeof Model & {
        new (values?: Partial<UserDomainAttributes>, options?: any): Model<UserDomainAttributes, UserDomainCreationAttributes>;
    };

    export const PaymentMethod: typeof Model & {
        new (
            values?: Partial<PaymentMethodAttributes>,
            options?: any
        ): Model<PaymentMethodAttributes, PaymentMethodCreationAttributes>;

        findAll<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<T extends true ? PaymentMethodAttributes[] : Model<PaymentMethodAttributes, PaymentMethodCreationAttributes>[]>;

        findOne<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<T extends true ? PaymentMethodAttributes | null : Model<PaymentMethodAttributes, PaymentMethodCreationAttributes> | null>;
    };

    export const UserPaymentMethod: typeof Model & {
        new (
            values?: Partial<UserPaymentMethodAttributes>,
            options?: any
        ): Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes>;

        findAll<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<T extends true ? UserPaymentMethodAttributes[] : Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes>[]>;

        findOne<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<T extends true ? UserPaymentMethodAttributes | null : Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes> | null>;
    };

    // ----------------- db object -----------------
    export interface DB {
        sequelize: Sequelize;
        Sequelize: typeof import("sequelize");

        User: typeof Model & {
            new (values?: Partial<UserAttributes>, options?: any): Model<UserAttributes, UserCreationAttributes>;
        };

        UserDomain: typeof Model & {
            new (values?: Partial<UserDomainAttributes>, options?: any): Model<UserDomainAttributes, UserDomainCreationAttributes>;
        };

        PaymentMethod: typeof Model & {
            new (
                values?: Partial<PaymentMethodAttributes>,
                options?: any
            ): Model<PaymentMethodAttributes, PaymentMethodCreationAttributes>;

            findAll<T extends boolean = false>(
                options?: FindOptions & { raw?: T }
            ): Promise<T extends true ? PaymentMethodAttributes[] : Model<PaymentMethodAttributes, PaymentMethodCreationAttributes>[]>;

            findOne<T extends boolean = false>(
                options?: FindOptions & { raw?: T }
            ): Promise<T extends true ? PaymentMethodAttributes | null : Model<PaymentMethodAttributes, PaymentMethodCreationAttributes> | null>;
        };

        UserPaymentMethod: typeof Model & {
            new (
                values?: Partial<UserPaymentMethodAttributes>,
                options?: any
            ): Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes>;

            findAll<T extends boolean = false>(
                options?: FindOptions & { raw?: T }
            ): Promise<T extends true ? UserPaymentMethodAttributes[] : Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes>[]>;

            findOne<T extends boolean = false>(
                options?: FindOptions & { raw?: T }
            ): Promise<T extends true ? UserPaymentMethodAttributes | null : Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes> | null>;
        };
    }

    const db: DB;
    export default db;
}
