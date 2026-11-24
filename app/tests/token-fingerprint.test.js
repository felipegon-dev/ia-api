const assert = require('node:assert/strict');
const { test } = require('node:test');
const jwt = require('jsonwebtoken');
const { compressToEncodedURIComponent } = require('lz-string');
const Token = require('../src/services/base/Token').default;
const UserData = require('../src/services/base/UserData').default;
const { Crypt } = require('../src/services/base/Crypt');

process.env.TOKEN_EXPIRATION = '1h';
process.env.TOKEN_ALGORITHM = 'aes-256-gcm';
process.env.TOKEN_ENCRYPTION_SECRET = 'fingerprint-test-encryption-key';
process.env.JWT_SECRET = 'fingerprint-test-jwt-secret';

function request({ forwardedFor = '172.68.134.218, 172.68.134.218', ...userData } = {}) {
    return {
        ip: '127.0.0.1',
        headers: {
            'user-agent': 'checkout-test-browser',
            'x-forwarded-for': forwardedFor,
            'x-user-data': compressToEncodedURIComponent(JSON.stringify({
                userId: 'test-shop',
                userAgent: 'checkout-test-browser',
                platform: 'Linux',
                timezone: 'Europe/Madrid',
                ...userData,
            })),
        },
    };
}

function authenticate(req, token) {
    req.headers['x-app-token-api'] = token;
    return req;
}

for (const encrypted of [false, true]) {
    test(`fingerprint validation (encrypted=${encrypted})`, async (t) => {
        process.env.TOKEN_ENCRYPTION_ENABLED = String(encrypted);
        const service = new Token(new UserData());
        const issuedToken = service.get(request(), {});
        const crypt = new Crypt(process.env.TOKEN_ALGORITHM, process.env.TOKEN_ENCRYPTION_SECRET);
        const encode = (token) => encrypted ? crypt.encrypt(token) : token;

        await t.test('accepts the original fingerprint', () => {
            assert.equal(service.validate(authenticate(request(), issuedToken)).userId, 'test-shop');
        });

        for (const forwardedFor of [
            '172.68.134.82, 172.68.134.82',
            '203.0.113.1, 172.68.134.82, 172.26.0.17',
            '',
        ]) {
            await t.test(`accepts a changed proxy chain: ${forwardedFor}`, () => {
                const req = request({ forwardedFor });
                assert.equal(service.validate(authenticate(req, issuedToken)).userId, 'test-shop');
            });
        }

        await t.test('accepts a missing forwarded header with an existing token', () => {
            const req = request();
            delete req.headers['x-forwarded-for'];
            assert.equal(service.validate(authenticate(req, issuedToken)).userId, 'test-shop');
        });

        for (const [field, value] of [
            ['userAgent', 'another-browser'],
            ['platform', 'another-platform'],
            ['timezone', 'another-timezone'],
        ]) {
            await t.test(`still rejects a changed ${field}`, () => {
                const req = authenticate(request({ [field]: value }), issuedToken);
                assert.throws(() => service.validate(req), {
                    status: 401,
                    code: 'TOKEN_FINGERPRINT_MISMATCH',
                });
            });
        }

        await t.test('still rejects an invalid signature', () => {
            const token = encode(jwt.sign(service.getTokenPayload(request()), 'wrong-secret'));
            assert.throws(() => service.validate(authenticate(request(), token)), {
                status: 401,
                code: 'TOKEN_INVALID',
            });
        });

        await t.test('still rejects an expired token', () => {
            const token = encode(jwt.sign({
                ...service.getTokenPayload(request()),
                exp: 1,
            }, process.env.JWT_SECRET));
            assert.throws(() => service.validate(authenticate(request(), token)), {
                status: 401,
                code: 'TOKEN_EXPIRED',
            });
        });
    });
}
