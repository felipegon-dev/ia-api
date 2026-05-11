import { UserExtended } from '@apptypes/UserExtended';
import {UserDomainAttributes} from "@config/database/models";

/* =========================
   DTOs de salida API
========================= */
export interface UserPaymentMethodDTO {
    code: string;
    name: string;
}

export interface ShippingDTO {
    id: number;
    userDomainId: number;
    name: string;
    code: string;
    price: number;
    currency: string;
    deliveryTimeDescription?: string | null;
    freeShippingFrom: number | null;
    active: boolean;
    defaultMethod: boolean;
}

export interface UserDTO {
    shipping: ShippingDTO[];
    paymentMethods: UserPaymentMethodDTO[];
}

/* =========================
   Mapper User → UserDTO
========================= */
export function toUserDTO(user: UserExtended, userDomainAttributes: UserDomainAttributes, total: number = 0): UserDTO {
    const shipping: ShippingDTO[] = (userDomainAttributes.shippingMethods ?? []).map(method => {
        const price = parseFloat(String(method.price ?? 0));
        const freeShippingFrom = method.freeShippingFrom != null
            ? parseFloat(String(method.freeShippingFrom))
            : null;

        const isFree =
            freeShippingFrom != null &&
            freeShippingFrom > 0 &&
            total >= freeShippingFrom;

        return {
            id: method.id,
            userDomainId: method.userDomainId,
            name: method.name,
            code: method.code,
            price: isFree ? 0 : price,
            currency: method.currency,
            deliveryTimeDescription: method.deliveryTimeDescription ?? null,
            freeShippingFrom,
            active: method.active,
            defaultMethod: method.defaultMethod,
        };
    });

    return {
        shipping,
        paymentMethods: (user.userPaymentMethods ?? [])
            .map((upm): UserPaymentMethodDTO | null => {
                const pm = upm.paymentMethod;
                if (!pm) return null;
                return {
                    code: pm.code ?? '',
                    name: pm.name,
                };
            })
            .filter(
                (pm: UserPaymentMethodDTO | null): pm is UserPaymentMethodDTO => pm !== null
            ),
    };
}
