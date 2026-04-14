import BaseEvent from "@src/events/Base/BaseEvent";
import {EventType} from "@src/services/queue/EventData";

export default class CallbackPayment extends BaseEvent {

    getEventType(): EventType {
        return EventType.callbackPayment;
    }

    async run(): Promise<boolean> {
        const callBackData = await this.paymentManager.getOrderWithDomainInfo(this.eventData?.getOrderId() as string);
        return await this.sendCallback(callBackData);
    }
}