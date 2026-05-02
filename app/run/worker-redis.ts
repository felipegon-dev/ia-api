import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import EventData, {EventType} from "@src/services/queue/EventData";

import {container} from '@config/v1.api.routes';
import PostPayment from "@src/events/PostPayment";
import {WorkerError} from "@src/errors/WorkerError";
import CallbackPayment from "@src/events/CallbackPayment";


const RedisManager = require('@src/services/queue/RedisManager').default;

async function main() {
    const redis = new RedisManager();

    const isConnected = await redis.checkConnection();
    if (!isConnected) {
        console.error('Redis connection failed. Exiting worker.');
        process.exit(1);
    }

    await redis.initStream();

    console.log('Worker started...');

    while (true) {
        await processPendingMessages(redis);
        await processNewMessages(redis);
        await clearExpiredMessages(redis);
        await new Promise(r => setTimeout(r, 500));
    }
}

async function clearExpiredMessages(redis: any) {
    try {
        await redis.clearTTLMessages();
    } catch (err: any) {
        console.error(`[${new Date().toISOString()}] clearTTLMessages fail:`, err.message);
        await new Promise(r => setTimeout(r, 2000));
    }
}
async function processNewMessages(redis: any) {
    try {
        const event = await redis.getEvent();
        if (event) {
            console.log(`[${new Date().toISOString()}] New event ${event.id}:`, event.data);
            await runAndCommit(redis, event);
        }
    } catch (err: any) {
        console.error(`[${new Date().toISOString()}] New event fail:`, err.message);
        await new Promise(r => setTimeout(r, 2000));
    }
}
async function processPendingMessages(redis: any) {
    try {
        const reclaimed = await redis.reclaimWithBackoff();
        if (reclaimed.length > 0) {
            console.log(`[${new Date().toISOString()}] Reclaimed ${reclaimed.length} messages`);
        }

        for (const event of reclaimed) {
            console.log(`[${new Date().toISOString()}] Processing reclaimed event ${event.id}:`, event.data);
            await runAndCommit(redis, event);
        }

    } catch (err: any) {
        console.error(`[${new Date().toISOString()}] Old messages fail:`, err.message);
        await new Promise(r => setTimeout(r, 2000));
    }
}

async function runAndCommit(redis: any, event: any): Promise<void> {
    if (await runEvent(event.data)) {
        await redis.commitEvent(event.id);
        console.info('Event processed successfully for', event.id);
    } else {
        console.error(`[${new Date().toISOString()}] Event processing failed for ${event.id}`);
    }
}

function runEvent(event: EventData): Promise<boolean> {
    let eventType = null;
    switch (event.getType()) {
        case EventType.postPayment:
            eventType = container.get(PostPayment);
            break;
        case EventType.callbackPayment:
            eventType = container.get(CallbackPayment);
            break;
    }

    if (null === eventType) {
        throw new WorkerError('Unknown event type: ' + event.getType());
    } else {
        return eventType.setEventData(event).run();
    }
}

// 5️⃣ Ejecutar
main().catch(err => {
    console.error('Worker crashed:', err);
    process.exit(1);
});