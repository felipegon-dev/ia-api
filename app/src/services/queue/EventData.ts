export enum EventType {
    postPayment = 'postPayment',
    callbackPayment = 'callbackPayment',
}

export default class EventData {
    private readonly name: string;
    private readonly orderId: string;
    private readonly type: EventType;
    private readonly createdAt: string;

    constructor(name: string, orderId: string, type: EventType, createdAt?: string) {
        this.name = name;
        this.orderId = orderId;
        this.type = type;
        this.createdAt = createdAt ?? new Date().toISOString();
    }

    static fromJSON(json: string): EventData {
        const obj = JSON.parse(json);
        return new EventData(
            obj.name,
            obj.orderId,
            obj.type as EventType,
            obj.createdAt
        );
    }

    toJSONString(): string {
        return JSON.stringify({
            name: this.name,
            orderId: this.orderId,
            type: this.type,
            createdAt: this.createdAt
        });
    }

    getName(): string {
        return this.name;
    }

    getType(): EventType {
        return this.type;
    }

    getOrderId(): string {
        return this.orderId;
    }

    getCreatedAt(): string {
        return this.createdAt;
    }
}