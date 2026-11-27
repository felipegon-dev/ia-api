const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const RedisManager = require('../../src/services/queue/RedisManager').default;
const { default: EventData, EventType } = require('../../src/services/queue/EventData');

test('expired callbacks are retained atomically for reconciliation, not discarded', async () => {
    assert.equal(process.env.IA_HMAC_TEST_REDIS, '1', 'Run only against an isolated test Redis');
    const manager = new RedisManager();
    const stream = 'ia-hmac-test-' + randomUUID();
    try {
        assert.equal(await manager.checkConnection(), true);
        await manager.initStream(stream);
        const id = await manager.queueEvent(new EventData('postPayment', 'test-provider', EventType.postPayment), stream);
        await manager.deadLetter(id, 'expired', stream);
        await manager.deadLetter(id, 'expired', stream);
        assert.equal(await manager.redis.xlen(stream), 0);
        assert.equal(await manager.redis.xlen(stream + ':dead'), 1);
        const [[, fields]] = await manager.redis.xrange(stream + ':dead', '-', '+');
        assert.equal(fields[fields.indexOf('originalId') + 1], id);
        assert.equal(fields[fields.indexOf('failureReason') + 1], 'expired');
        assert.ok(fields[fields.indexOf('data') + 1].includes('test-provider'));
    } finally {
        await manager.redis.del(stream, stream + ':dead');
        await manager.disconnect();
    }
});

test('successfully acknowledged callbacks are deleted and never expire into dead letters', async () => {
    assert.equal(process.env.IA_HMAC_TEST_REDIS, '1', 'Run only against an isolated test Redis');
    const manager = new RedisManager();
    const stream = 'ia-hmac-test-' + randomUUID();
    try {
        await manager.initStream(stream);
        const event = new EventData('postPayment', 'successful-provider', EventType.postPayment);
        const id = await manager.redis.xadd(stream, '*', 'data', event.toJSONString(), 'expireAt', '1');
        assert.equal(await manager.commitEvent(id, stream), 0);
        assert.equal(await manager.redis.xlen(stream), 1);
        assert.equal((await manager.getEvent(stream)).id, id);
        assert.equal(await manager.commitEvent(id, stream), 1);
        assert.equal(await manager.commitEvent(id, stream), 0);
        await manager.clearTTLMessages(stream);
        assert.equal(await manager.redis.xlen(stream), 0);
        assert.equal(await manager.redis.xlen(stream + ':dead'), 0);
    } finally {
        await manager.redis.del(stream, stream + ':dead');
        await manager.disconnect();
    }
});

test('expired unacknowledged callbacks remain available for reconciliation', async () => {
    assert.equal(process.env.IA_HMAC_TEST_REDIS, '1', 'Run only against an isolated test Redis');
    const manager = new RedisManager();
    const stream = 'ia-hmac-test-' + randomUUID();
    try {
        await manager.initStream(stream);
        const event = new EventData('postPayment', 'failed-provider', EventType.postPayment);
        const id = await manager.redis.xadd(stream, '*', 'data', event.toJSONString(), 'expireAt', '1');
        assert.equal((await manager.getEvent(stream)).id, id);
        await manager.clearTTLMessages(stream);
        assert.equal(await manager.redis.xlen(stream), 0);
        const [[, fields]] = await manager.redis.xrange(stream + ':dead', '-', '+');
        assert.equal(fields[fields.indexOf('originalId') + 1], id);
        assert.equal(fields[fields.indexOf('failureReason') + 1], 'expired');
    } finally {
        await manager.redis.del(stream, stream + ':dead');
        await manager.disconnect();
    }
});
