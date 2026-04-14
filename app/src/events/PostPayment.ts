import BaseEvent from "@src/events/Base/BaseEvent";
import {EventType} from "@src/services/queue/EventData";

export default class PostPayment extends BaseEvent {

    getEventType(): EventType {
        return EventType.postPayment;
    }

    async run(): Promise<boolean> {
        const callBackData = await this.paymentManager.getOrderWithDomainInfo(this.eventData?.getOrderId() as string);
        return await this.sendCallback(callBackData);
    }
}