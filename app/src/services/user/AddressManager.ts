import {UserExtended} from "@apptypes/UserExtended";

export const AddressType = {
    BILLING: 'billing' as const,
    SHIPPING: 'shipping' as const,
};

export type AddressType = (typeof AddressType)[keyof typeof AddressType];

export interface AddressItem {
    addressType: AddressType;
    fullName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    company?: string;
    vatId?: string;
}

export class AddressManager {
    private addressItems: AddressItem[] = [];

    async get(user: UserExtended, addressItems: AddressItem[]): Promise<AddressManager> {
        // todo validate items
        this.addressItems = addressItems;
        return this;
    }

    getItemsJson(): string {
        return JSON.stringify(this.addressItems);
    }
}