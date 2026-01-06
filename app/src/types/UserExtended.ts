import { Model } from 'sequelize';
import {UserDomainAttributes} from "@config/database/models";

/* =========================
   PaymentMethod (parcial)
========================= */
export interface PaymentMethodAttributes {
    id: number;
    name: string;
    code?: string;
}

/* =========================
   UserPaymentMethod
========================= */
export interface UserPaymentMethodAttributes {
    id: number;
    status: 'active' | 'inactive';
    paymentToken?: string | null;
    metadata?: Record<string, any> | null;
    paymentMethod?: PaymentMethodAttributes;
}

/* =========================
   User con relaciones
========================= */
export type UserExtended = Model & {
    domains?: UserDomainAttributes[];
    userPaymentMethods?: UserPaymentMethodAttributes[];
};
