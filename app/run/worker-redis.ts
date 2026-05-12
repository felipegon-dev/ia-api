import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
import EventData, {EventType} from "@src/services/queue/EventData";

import {container} from '@config/v1.api.routes';
import PostPayment from "@src/events/PostPayment";
import {WorkerError} from "@src/errors/WorkerError";
import CallbackPayment from "@src/events/CallbackPayment";
import logger from '@src/util/logger';

const RedisManager = require('@src/services/queue/RedisManager').default;

// ── Captura global de excepciones no manejadas ──────────────────────────────
process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException en worker — proceso terminando');
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandledRejection en worker — promesa rechazada sin capturar');
});

async function main() {
    const redis = new RedisManager();

    const isConnected = await redis.checkConnection();
    if (!isConnected) {
        logger.fatal('Redis connection failed. Exiting worker.');
        process.exit(1);
    }

    await redis.initStream();

    logger.info('Worker started...');

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
        logger.error({ err }, 'clearTTLMessages fail');
        await new Promise(r => setTimeout(r, 2000));
    }
}
async function processNewMessages(redis: any) {
    try {
        const event = await redis.getEvent();
        if (event) {
            logger.info({ eventId: event.id, eventData: event.data }, `New event ${event.id}`);
            await runAndCommit(redis, event);
        }
    } catch (err: any) {
        logger.error({ err }, 'New event fail');
        await new Promise(r => setTimeout(r, 2000));
    }
}
async function processPendingMessages(redis: any) {
    try {
        const reclaimed = await redis.reclaimWithBackoff();
        if (reclaimed.length > 0) {
            logger.info({ count: reclaimed.length }, `Reclaimed ${reclaimed.length} messages`);
        }

        for (const event of reclaimed) {
            logger.info({ eventId: event.id, eventData: event.data }, `Processing reclaimed event ${event.id}`);
            await runAndCommit(redis, event);
        }

    } catch (err: any) {
        logger.error({ err }, 'Old messages fail');
        await new Promise(r => setTimeout(r, 2000));
    }
}

async function runAndCommit(redis: any, event: any): Promise<void> {
    const isExpired = event.expireAt > 0 && Date.now() > event.expireAt;

    try {
        const success = await runEvent(event.data);

        if (success) {
            await redis.commitEvent(event.id);
            logger.info({ eventId: event.id }, 'Event processed successfully');
            return;
        }

        // runEvent devolvió false (procesamiento fallido pero sin excepción)
        if (isExpired) {
            await redis.commitEvent(event.id);
            logger.warn({ eventId: event.id, expireAt: event.expireAt }, 'Event processing failed and event has expired — removing from queue');
        } else {
            logger.error({ eventId: event.id }, 'Event processing failed — will be retried');
        }

    } catch (err: any) {
        const isUnrecoverable = err instanceof WorkerError;

        if (isUnrecoverable || isExpired) {
            // Tipos desconocidos nunca podrán procesarse; eventos expirados tampoco deben reintentarse
            await redis.commitEvent(event.id);
            logger.warn(
                { eventId: event.id, err, isExpired, isUnrecoverable, expireAt: event.expireAt },
                isExpired
                    ? 'Event expired and could not be processed — removing from queue'
                    : 'Unrecoverable event error — removing from queue to avoid infinite retry'
            );
        } else {
            // Error transitorio: se dejará en pending para reintento con backoff
            logger.error({ eventId: event.id, err }, 'Event processing threw an error — will be retried');
        }
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

// Ejecutar
main().catch(err => {
    logger.fatal({ err }, 'Worker crashed');
    process.exit(1);
});