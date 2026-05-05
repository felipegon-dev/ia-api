import Redis, { RedisOptions } from 'ioredis';
import EventData from "@src/services/queue/EventData";

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
            console.error('❌ Error connecting Redis:', error);
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
    ): Promise<{ id: string; data: EventData } | null> {
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

        return { id, data: EventData.fromJSON(rawData) };
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
    ): Promise<{ id: string; data: EventData; deliveryCount: number }[]> {

        const BASE_DELAY = 10000; // 10s
        const reclaimedEvents: { id: string; data: EventData; deliveryCount: number }[] = [];

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

                reclaimedEvents.push({
                    id: msgId,
                    data: EventData.fromJSON(rawData),
                    deliveryCount
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

    async clearTTLMessages(streamName: string = REDIS_DEFAULT_STREAM) {
        try {
            const messages = await this.redis.xrange(streamName, '-', '+');
            if (!messages || messages.length === 0) return;

            for (const [id, fields] of messages) {
                const expireIndex = fields.indexOf('expireAt');
                if (expireIndex === -1) continue;

                const expireAt = parseInt(fields[expireIndex + 1]);
                if (Date.now() > expireAt) {
                    console.log(`[${new Date().toISOString()}] Deleting expired message ${id}`);
                    await this.redis.xdel(streamName, id);
                }
            }
        } catch (err: any) {
            console.error(`[${new Date().toISOString()}] Error clearing TTL messages:`, err.message);
        }
    }

    async disconnect(): Promise<void> {
        await this.redis.quit();
    }
}

export default RedisManager;