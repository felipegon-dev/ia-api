import {
    Model,
    Optional,
    Sequelize,
    ModelStatic,
    FindOptions
} from "sequelize";

/* =========================
   User
========================= */

export type UserAttributes = {
    id: number;
    name: string;
    email: string;
    password: string;
    code: string;
    status: "active" | "inactive" | "banned";
    createdAt?: Date;
    updatedAt?: Date;
};

export type UserCreationAttributes = Optional<
    UserAttributes,
    "id" | "createdAt" | "updatedAt"
>;

export type UserModel = Model<UserAttributes, UserCreationAttributes>;

/* =========================
   DomainPreferences
========================= */

export type DomainPreferencesAttributes = {
    id: number;
    userDomainId: number;
    template?: string | null;
    callbackPaymentsUrl?: string | null;
    googleFeedUrl?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
};

export type DomainPreferencesCreationAttributes = Optional<
    DomainPreferencesAttributes,
    "id" | "template" | "callbackPaymentsUrl" | "googleFeedUrl" | "createdAt" | "updatedAt"
>;

export type DomainPreferencesModel = Model<
    DomainPreferencesAttributes,
    DomainPreferencesCreationAttributes
>;

/* =========================
   DomainShipping
========================= */

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

export type DomainShippingModel = Model<
    DomainShippingAttributes,
    DomainShippingCreationAttributes
>;

/* =========================
   UserDomain
========================= */

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

export type UserDomainModel = Model<
    UserDomainAttributes,
    UserDomainCreationAttributes
>;

/* =========================
   PaymentMethod
========================= */

export type PaymentMethodAttributes = {
    id: number;
    name: string;
    code: string;
    provider?: string | null;
    apiVersion?: string | null;
    status: "active" | "inactive";
    position: number;
    createdAt?: Date;
    updatedAt?: Date;
};

export type PaymentMethodCreationAttributes = Optional<
    PaymentMethodAttributes,
    "id" | "provider" | "apiVersion" | "createdAt" | "updatedAt"
>;

export type PaymentMethodModel = Model<
    PaymentMethodAttributes,
    PaymentMethodCreationAttributes
>;

/* =========================
   UserPaymentMethod
========================= */

export type UserPaymentMethodAttributes = {
    id: number;
    userId: number;
    paymentMethodId: number;
    status: "active" | "inactive";
    paymentToken?: string | null;
    metadata?: Record<string, any> | null;
    createdAt?: Date;
    updatedAt?: Date;
};

export type UserPaymentMethodCreationAttributes = Optional<
    UserPaymentMethodAttributes,
    "id" | "paymentToken" | "metadata" | "createdAt" | "updatedAt"
>;

export type UserPaymentMethodModel = Model<
    UserPaymentMethodAttributes,
    UserPaymentMethodCreationAttributes
>;

/* =========================
   UserPaymentOrders
========================= */

export type ProviderSyncAttempt = {
    date: string;
    result: string;
};

export type UserPaymentOrdersAttributes = {
    id: number;
    userPaymentMethodId: number;
    userDomainId: number;
    providerId: string;
    providerMetadata?: string;
    providerAttemptsSync?: ProviderSyncAttempt[] | null;
    cartItems: string;
    addressItems: string;
    amount?: number | null;
    shippingDetails?: string | null;
    description?: string | null;
    status: "pending" | "completed" | "failed" | "cancelled";
    createdAt?: Date;
    updatedAt?: Date;
};

export type UserPaymentOrdersCreationAttributes = Optional<
    UserPaymentOrdersAttributes,
    | "id"
    | "providerMetadata"
    | "providerAttemptsSync"
    | "amount"
    | "shippingDetails"
    | "description"
    | "createdAt"
    | "updatedAt"
>;

export type UserPaymentOrdersModel = Model<
    UserPaymentOrdersAttributes,
    UserPaymentOrdersCreationAttributes
>;

/* =========================
   Sequelize Models
========================= */

export const User: ModelStatic<UserModel>;
export const UserDomain: ModelStatic<UserDomainModel>;
export const DomainPreferences: ModelStatic<DomainPreferencesModel>;
export const DomainShipping: ModelStatic<DomainShippingModel>;
export const PaymentMethod: ModelStatic<PaymentMethodModel>;
export const UserPaymentMethod: ModelStatic<UserPaymentMethodModel>;
export const UserPaymentOrders: ModelStatic<UserPaymentOrdersModel>;

/* =========================
   Sequelize core
========================= */

export const sequelize: Sequelize;
export const Sequelize: typeof import("sequelize");

/* =========================
   DB object
========================= */

export interface DB {
    sequelize: Sequelize;
    Sequelize: typeof import("sequelize");

    User: ModelStatic<UserModel>;
    UserDomain: ModelStatic<UserDomainModel>;
    DomainPreferences: ModelStatic<DomainPreferencesModel>;
    DomainShipping: ModelStatic<DomainShippingModel>;
    PaymentMethod: ModelStatic<PaymentMethodModel>;
    UserPaymentMethod: ModelStatic<UserPaymentMethodModel>;
    UserPaymentOrders: ModelStatic<UserPaymentOrdersModel>;
}

export type UserPaymentOrderWithDomain = Model<UserPaymentOrdersAttributes> & {
    providerMetadata: string;
    cartItems: string;
    addressItems: string;
    amount: number;
    shippingDetails: string;
    description: string;
    createdAt: Date;
    userDomain?: {
        domain: string;
        preferences?: {
            callbackPaymentsUrl?: string | null;
        };
    };
};

declare const db: DB;

export default db;