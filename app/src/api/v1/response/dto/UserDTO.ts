import { UserExtended } from '@apptypes/UserExtended';
import {DomainShippingAttributes, UserDomainAttributes} from "@config/database/models";

/* =========================
   DTOs de salida API
========================= */
export interface UserPaymentMethodDTO {
    code: string;
    name: string;
}

export interface UserDTO {
    preferences: {
        changeAddressUrl: string
    },
    shipping: DomainShippingAttributes[],
    paymentMethods: UserPaymentMethodDTO[];
}

/* =========================
   Mapper User → UserDTO
========================= */
export function toUserDTO(user: UserExtended, userDomainAttributes: UserDomainAttributes): UserDTO {
    return {
        preferences: {
            changeAddressUrl: userDomainAttributes.preferences?.changeAddressUrl as string
        },
        shipping: userDomainAttributes.shippingMethods as [],
        paymentMethods: (user.userPaymentMethods ?? [])
            .map((upm): UserPaymentMethodDTO | null => {
                const pm = upm.paymentMethod;

                if (!pm) {
                    return null;
                }

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
