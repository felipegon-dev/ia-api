import {UserExtended} from "@apptypes/UserExtended";

interface AddressItem {
}

export class AddressManager {
    // todo
    getShippingDetails(): string {
        return ''
    }

    async get(user: UserExtended, addressItems: AddressItem[]): Promise<AddressManager> {
        return this;
    }

    getAddressItemsJson(): string {
        // todo json
        return '';
    }
}