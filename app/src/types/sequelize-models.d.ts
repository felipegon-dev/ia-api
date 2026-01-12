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

    export type UserCreationAttributes = Optional<
        UserAttributes,
        "id" | "createdAt" | "updatedAt"
    >;

    // ----------------- UserDomain -----------------
    export type UserDomainAttributes = {
        id: number;
        userId: number;
        domain: string;
        createdAt?: Date;
        updatedAt?: Date;
        preferences?: DomainPreferencesAttributes;
        shippingMethods?: DomainShippingAttributes[];
    };

    export type UserDomainCreationAttributes = Optional<
        UserDomainAttributes,
        "id" | "createdAt" | "updatedAt"
    >;

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

    // ----------------- UserPaymentOrders -----------------
    export type UserPaymentOrdersAttributes = {
        id: number;
        userPaymentMethodId: number;
        userDomainId: number,
        providerId: string;
        providerMetadata?: string;
        providerAttemptsSync?: ProviderSyncAttempt[] | null;
        cartItems: string;
        addressItems: string;
        amount?: number | null;
        shippingDetails?: string | null;
        description?: string | null;
        status: 'pending' | 'completed' | 'failed' | 'cancelled';
        createdAt?: Date;
        updatedAt?: Date;
    };

    export type UserPaymentOrdersCreationAttributes = Optional<
        UserPaymentOrdersAttributes,
        'id' | 'providerMetadata' | 'providerAttemptsSync' | 'amount' | 'shippingDetails' | 'description' | 'createdAt' | 'updatedAt'
    >;

    // ----------------- Sequelize core -----------------
    export const sequelize: Sequelize;
    export const Sequelize: typeof import("sequelize");

    // ----------------- Sequelize Models -----------------
    export const User: typeof Model & {
        new (
            values?: Partial<UserAttributes>,
            options?: any
        ): Model<UserAttributes, UserCreationAttributes>;
    };

    export const UserDomain: typeof Model & {
        new (
            values?: Partial<UserDomainAttributes>,
            options?: any
        ): Model<UserDomainAttributes, UserDomainCreationAttributes>;
    };

    export const PaymentMethod: typeof Model & {
        new (
            values?: Partial<PaymentMethodAttributes>,
            options?: any
        ): Model<PaymentMethodAttributes, PaymentMethodCreationAttributes>;

        findAll<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<
            T extends true
                ? PaymentMethodAttributes[]
                : Model<PaymentMethodAttributes, PaymentMethodCreationAttributes>[]
        >;

        findOne<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<
            T extends true
                ? PaymentMethodAttributes | null
                : Model<PaymentMethodAttributes, PaymentMethodCreationAttributes> | null
        >;
    };

    export const UserPaymentMethod: typeof Model & {
        new (
            values?: Partial<UserPaymentMethodAttributes>,
            options?: any
        ): Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes>;

        findAll<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<
            T extends true
                ? UserPaymentMethodAttributes[]
                : Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes>[]
        >;

        findOne<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<
            T extends true
                ? UserPaymentMethodAttributes | null
                : Model<UserPaymentMethodAttributes, UserPaymentMethodCreationAttributes> | null
        >;
    };

    export const UserPaymentOrders: typeof Model & {
        new (
            values?: Partial<UserPaymentOrdersAttributes>,
            options?: any
        ): Model<UserPaymentOrdersAttributes, UserPaymentOrdersCreationAttributes>;

        findAll<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<
            T extends true
                ? UserPaymentOrdersAttributes[]
                : Model<UserPaymentOrdersAttributes, UserPaymentOrdersCreationAttributes>[]
        >;

        findOne<T extends boolean = false>(
            options?: FindOptions & { raw?: T }
        ): Promise<
            T extends true
                ? UserPaymentOrdersAttributes | null
                : Model<UserPaymentOrdersAttributes, UserPaymentOrdersCreationAttributes> | null
        >;
    };

    // ----------------- DomainPreferences -----------------
    export type DomainPreferencesAttributes = {
        id: number;
        userDomainId: number;
        template?: string | null;
        googleFeedUrl?: string | null;
        createdAt?: Date;
        updatedAt?: Date;
    };

    export type DomainPreferencesCreationAttributes = Optional<
        DomainPreferencesAttributes,
        "id" | "template" | "googleFeedUrl" | "createdAt" | "updatedAt"
    >;

    export const DomainPreferences: typeof Model & {
        new (
            values?: Partial<DomainPreferencesAttributes>,
            options?: any
        ): Model<DomainPreferencesAttributes, DomainPreferencesCreationAttributes>;
    };

    // ----------------- DomainShipping -----------------
    export type DomainShippingAttributes = {
        id: number;
        userDomainId: number;
        name: string;
        code: string;
        price: number;
        currency: string;
        deliveryTimeDescription?: string | null;
        freeShippingFrom?: number | null;
        active: boolean;
        defaultMethod: boolean;
        createdAt?: Date;
        updatedAt?: Date;
    };

    export type DomainShippingCreationAttributes = Optional<
        DomainShippingAttributes,
        "id" | "deliveryTimeDescription" | "freeShippingFrom" | "createdAt" | "updatedAt"
    >;

    export const DomainShipping: typeof Model & {
        new (
            values?: Partial<DomainShippingAttributes>,
            options?: any
        ): Model<DomainShippingAttributes, DomainShippingCreationAttributes>;
    };


    // ----------------- db object -----------------
    export interface DB {
        sequelize: Sequelize;
        Sequelize: typeof import("sequelize");

        User: typeof User;
        UserDomain: typeof UserDomain;
        DomainPreferences: typeof DomainPreferences;
        DomainShipping: typeof DomainShipping;
        PaymentMethod: typeof PaymentMethod;
        UserPaymentMethod: typeof UserPaymentMethod;
        UserPaymentOrders: typeof UserPaymentOrders;
    }


    const db: DB;
    export default db;
}
