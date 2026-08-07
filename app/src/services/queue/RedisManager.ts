import Redis, { RedisOptions } from 'ioredis';
import EventData from "@src/services/queue/EventData";
import logger from '@src/util/logger';

type XReadGroupResponse = [
    string,
    [string, string[]][]
][];

const REDIS_DEFAULT_STREAM = 'default_stream';
const REDIS_DEFAULT_GROUP = 'default_group';
const REDIS_DEFAULT_EXPIRATION_MESSAGE_TIME = parseInt(process.env.REDIS_MESSAGE_EXPIRATION_MS || String(60 * 1000), 10);
const CONSUMER_NAME = 'ia-worker'; // nombre constante de consumidor

class RedisManager {
    public redis: Redis;

    constructor() {
        const redisOptions: RedisOptions = {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
            ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {}),
            connectTimeout: 5000,
            maxRetriesPerRequest: 1,
        };
        this.redis = new Redis(redisOptions);
    }

    async checkConnection(): Promise<boolean> {
        try {
            const response = await this.redis.ping();
            return response === 'PONG';
        } catch (error) {
            logger.error({ err: error }, 'Error connecting to Redis');
            return false;
        }
    }

    async initStream(streamName: string = REDIS_DEFAULT_STREAM, groupName: string = REDIS_DEFAULT_GROUP): Promise<void> {
        try {
            await this.redis.xgroup('CREATE', streamName, groupName, '0', 'MKSTREAM');
        } catch (err: any) {
            if (!err.message.includes('BUSYGROUP')) throw err;
        }
    }

    async queueEvent(event: EventData, streamName: string = REDIS_DEFAULT_STREAM): Promise<string> {
        const id = await this.redis.xadd(
            streamName,
            '*',
            'data', event.toJSONString(),
            'expireAt', (Date.now() + REDIS_DEFAULT_EXPIRATION_MESSAGE_TIME).toString()
        );
        if (!id) throw new Error('XADD does not have ID');
        return id;
    }

    async getEvent(
        streamName: string = REDIS_DEFAULT_STREAM,
        groupName: string = REDIS_DEFAULT_GROUP,
        blockSeconds: number = 5
    ): Promise<{ id: string; data: EventData; expireAt: number } | null> {
        const blockMs = blockSeconds * 1000;
        const response = await this.redis.xreadgroup(
            'GROUP',
            groupName,
            CONSUMER_NAME,
            'COUNT', 1,
            'BLOCK', blockMs,
            'STREAMS', streamName,
            '>'
        ) as XReadGroupResponse | null;

        if (!response) return null;

        const [[, messages]] = response;
        if (!messages || messages.length === 0) return null;

        const [id, fields] = messages[0];
        const dataIndex = fields.indexOf('data');
        if (dataIndex === -1) return null;

        const rawData = fields[dataIndex + 1];
        const expireIndex = fields.indexOf('expireAt');
        const expireAt = expireIndex !== -1 ? parseInt(fields[expireIndex + 1], 10) : 0;

        return { id, data: EventData.fromJSON(rawData), expireAt };
    }

    // todo delete
    async getPendingEvents(
        streamName: string = REDIS_DEFAULT_STREAM,
        groupName: string = REDIS_DEFAULT_GROUP
    ): Promise<{ id: string; data: any; consumer: string; idle: number }[]> {
        await this.initStream();
        type PendingEntry = [string, string, number, number];
        const pendingEvents: { id: string; data: any; consumer: string; idle: number }[] = [];
        let start = '-';
        let end = '+';
        let count = 1000;
        let fetchMore = true;

        while (fetchMore) {
            const pending = await this.redis.xpending(streamName, groupName, start, end, count) as PendingEntry[];
            if (!pending || pending.length === 0) break;

            for (const [id, consumer, idle] of pending) {
                const messages = await this.redis.xrange(streamName, id, id);
                if (!messages || messages.length === 0) continue;
                const [, fields] = messages[0];
                const dataIndex = fields.indexOf('data');
                if (dataIndex === -1) continue;

                pendingEvents.push({ id, data: JSON.parse(fields[dataIndex + 1]), consumer, idle });
            }

            if (pending.length < count) fetchMore = false;
            else start = pending[pending.length - 1][0];
        }

        return pendingEvents;
    }

    async reclaimWithBackoff(
        streamName: string = REDIS_DEFAULT_STREAM,
        groupName: string = REDIS_DEFAULT_GROUP
    ): Promise<{ id: string; data: EventData; deliveryCount: number; expireAt: number }[]> {

        const BASE_DELAY = 10000; // 10s
        const reclaimedEvents: { id: string; data: EventData; deliveryCount: number; expireAt: number }[] = [];

        type PendingEntry = [string, string, number, number];
        const pending = await this.redis.xpending(
            streamName,
            groupName,
            '-',
            '+',
            100
        ) as PendingEntry[];

        if (!pending || pending.length === 0) {
            return reclaimedEvents;
        }

        for (const [id, , idle, deliveryCount] of pending) {

            const requiredDelay = deliveryCount * BASE_DELAY;

            if (idle < requiredDelay) {
                continue;
            }

            type XAutoClaimResponse = [string, [string, string[]][]];

            const result = await this.redis.xautoclaim(
                streamName,
                groupName,
                CONSUMER_NAME,
                requiredDelay,
                id,
                'COUNT',
                1
            ) as XAutoClaimResponse;

            if (!result || result.length < 2) {
                continue;
            }

            const messages = result[1];

            if (!messages || messages.length === 0) {
                continue;
            }

            for (const [msgId, fields] of messages) {

                const dataIndex = fields.indexOf('data');
                if (dataIndex === -1) {
                    continue;
                }

                const rawData = fields[dataIndex + 1];
                if (!rawData) {
                    continue;
                }

                const expireIndex = fields.indexOf('expireAt');
                const expireAt = expireIndex !== -1 ? parseInt(fields[expireIndex + 1], 10) : 0;

                reclaimedEvents.push({
                    id: msgId,
                    data: EventData.fromJSON(rawData),
                    deliveryCount,
                    expireAt,
                });
            }
        }

        return reclaimedEvents;
    }

    async commitEvent(
        messageId: string,
        streamName: string = REDIS_DEFAULT_STREAM,
        groupName: string = REDIS_DEFAULT_GROUP,
    ): Promise<number> {
        return this.redis.xack(streamName, groupName, messageId);
    }

    async invalidateEventsByOrderId(
        orderId: string,
        streamName: string = REDIS_DEFAULT_STREAM,
        groupName: string = REDIS_DEFAULT_GROUP,
    ): Promise<{ matched: number; acked: number; deleted: number }> {
        await this.initStream(streamName, groupName);
        const ids = await this.findEventIdsByOrderId(orderId, streamName);
        if (ids.length === 0) {
            return { matched: 0, acked: 0, deleted: 0 };
        }

        let acked = 0;
        let deleted = 0;
        const idChunks = this.chunk(ids, 100);

        for (const chunk of idChunks) {
            acked += await this.redis.xack(streamName, groupName, ...chunk);
            deleted += await this.redis.xdel(streamName, ...chunk);
        }

        logger.info({ orderId, matched: ids.length, acked, deleted }, 'Invalidated worker events by orderId');
        return { matched: ids.length, acked, deleted };
    }

    async invalidateEventById(
        eventId: string,
        streamName: string = REDIS_DEFAULT_STREAM,
        groupName: string = REDIS_DEFAULT_GROUP,
    ): Promise<{ matched: number; acked: number; deleted: number }> {
        await this.initStream(streamName, groupName);

        const messages = await this.redis.xrange(streamName, eventId, eventId) as [string, string[]][];
        if (!messages || messages.length === 0) {
            return { matched: 0, acked: 0, deleted: 0 };
        }

        const acked = await this.redis.xack(streamName, groupName, eventId);
        const deleted = await this.redis.xdel(streamName, eventId);

        logger.info({ eventId, matched: 1, acked, deleted }, 'Invalidated worker event by eventId');
        return { matched: 1, acked, deleted };
    }

    async clearTTLMessages(streamName: string = REDIS_DEFAULT_STREAM) {
        try {
            const messages = await this.redis.xrange(streamName, '-', '+');
            if (!messages || messages.length === 0) return;

            for (const [id, fields] of messages) {
                const expireIndex = fields.indexOf('expireAt');
                if (expireIndex === -1) continue;

                const expireAt = parseInt(fields[expireIndex + 1]);
                if (Date.now() > expireAt) {
                    logger.info({ messageId: id }, 'Deleting expired message');
                    await this.redis.xdel(streamName, id);
                }
            }
        } catch (err: any) {
            logger.error({ err }, 'Error clearing TTL messages');
        }
    }

    async disconnect(): Promise<void> {
        await this.redis.quit();
    }

    private async findEventIdsByOrderId(orderId: string, streamName: string): Promise<string[]> {
        const ids: string[] = [];
        const count = 200;
        let start = '-';

        while (true) {
            const messages = await this.redis.xrange(
                streamName,
                start,
                '+',
                'COUNT',
                count
            ) as [string, string[]][];

            if (!messages || messages.length === 0) {
                break;
            }

            for (const [id, fields] of messages) {
                const dataIndex = fields.indexOf('data');
                if (dataIndex === -1) {
                    continue;
                }
                const rawData = fields[dataIndex + 1];
                if (!rawData) {
                    continue;
                }

                let eventData: EventData;
                try {
                    eventData = EventData.fromJSON(rawData);
                } catch (error) {
                    logger.warn({ err: error, messageId: id }, 'Skipping invalid event payload while invalidating by orderId');
                    continue;
                }
                if (eventData.getOrderId() === orderId) {
                    ids.push(id);
                }
            }

            if (messages.length < count) {
                break;
            }

            const lastId = messages[messages.length - 1][0];
            start = `(${lastId}`;
        }

        return ids;
    }

    private chunk<T>(items: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < items.length; i += size) {
            chunks.push(items.slice(i, i + size));
        }
        return chunks;
    }
}

export default RedisManager;