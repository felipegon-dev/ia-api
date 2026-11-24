import EventData, {EventType} from "@src/services/queue/EventData";
import {EventInterface} from "@src/events/Base/EventInterface";
import {CallBackData, PaymentManager} from "@src/services/payment/PaymentManager";
import fetch from "node-fetch";
import logger from '@src/util/logger';
import { callbackHeaders } from '@src/services/security/HmacProtocol';

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
            logger.info({ providerId: this.eventData?.getOrderId() }, 'Sending callback');
            const providerId = this.eventData?.getOrderId();
            if (!providerId) throw new Error('Callback provider id is missing');
            const body = JSON.stringify({
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
                });
            const headers = callBackData.signingKey?.enabled
                ? callbackHeaders(body, callBackData.signingKey, this.getEventType(), providerId) : {};
            const response = await fetch(callBackData.callbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                redirect: 'manual', body, signal: AbortSignal.timeout(15000),
            });

            logger.info(
                { status: response.status, statusText: response.statusText },
                'Callback response received'
            );

            const text = await response.text();

            let json: { success?: boolean };
            try {
                json = JSON.parse(text);
            } catch {
                logger.error('Callback response is not valid JSON');
                return false;
            }

            return response.ok && json?.success === true;
        } catch {
            logger.error({ providerId: this.eventData?.getOrderId() }, 'Callback delivery failed; retry required');
            return false;
        }
    }
}