import EventData, {EventType} from "@src/services/queue/EventData";
import {EventInterface} from "@src/events/Base/EventInterface";
import {CallBackData, PaymentManager} from "@src/services/payment/PaymentManager";
import https from "https";
import fetch from "node-fetch";
import logger from '@src/util/logger';

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
            logger.info({ callbackUrl: callBackData.callbackUrl }, 'Sending callback');

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

            logger.info(
                { status: response.status, statusText: response.statusText },
                'Callback response received'
            );

            const text = await response.text();

            let json: any;
            try {
                json = JSON.parse(text);
                logger.debug({ responseBody: json }, 'Callback response parsed JSON');
            } catch {
                logger.error({ responseBody: text }, 'Callback response is not valid JSON');
            }

            return response.ok;
        } catch (error) {
            logger.error({ err: error }, 'Error sending callback');
            return false;
        }
    }
}