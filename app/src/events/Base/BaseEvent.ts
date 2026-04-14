import EventData, {EventType} from "@src/services/queue/EventData";
import {EventInterface} from "@src/events/Base/EventInterface";
import {CallBackData, PaymentManager} from "@src/services/payment/PaymentManager";
import https from "https";
import fetch from "node-fetch";

export default abstract class BaseEvent implements EventInterface {
    protected eventData: EventData | undefined;

    constructor(protected readonly paymentManager: PaymentManager) {
    }

    abstract getEventType(): EventType;

    run(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    public setEventData(eventData: EventData): EventInterface {
        this.eventData = eventData;
        return this;
    }

    async sendCallback(callBackData: CallBackData): Promise<boolean> {
        try {
            console.info('Sending callback to:', callBackData.callbackUrl);

            const agent = new https.Agent({ rejectUnauthorized: false });

            const response = await fetch(callBackData.callbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                redirect: 'manual',
                body: JSON.stringify({
                    eventType: this.getEventType(),
                    provider: {
                        metadata: callBackData.providerMetadata,
                        id: this.eventData?.getOrderId()
                    },
                    cartItems: callBackData.cartItems,
                    addressItems: callBackData.addressItems,
                    amount: callBackData.amount,
                    shippingDetails: callBackData.shippingDetails,
                    description: callBackData.description,
                    createdAt: callBackData.createdAt
                }),
                agent
            });

            console.info('Callback response status:', response.status, response.statusText);
            console.info('Callback response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

            const text = await response.text();
            console.info('Callback response body:', text);

            let json: any;
            try {
                json = JSON.parse(text);
                console.info('Callback response parsed JSON:', json);
            } catch {
                console.warn('Callback response is not valid JSON');
            }

            return response.ok;
        } catch (error) {
            console.error('Error sending callback:', error);
            return false;
        }
    }
}