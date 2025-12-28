import {UserExtended} from "@apptypes/UserExtended";

interface AddressItem {
}

export class AddressManager {
    // todo
    getShippingCost(): number {
        return 0;
    }

    async get(user: UserExtended, addressItems: AddressItem[]): Promise<AddressManager> {
        return this;
    }

    getAddressItemsJson(): string {
        // todo json
        return '';
    }
}