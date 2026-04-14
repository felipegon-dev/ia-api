import EventData from "@src/services/queue/EventData";

export interface EventInterface {
    setEventData(eventData: EventData): EventInterface;
    run(): Promise<boolean>;
}