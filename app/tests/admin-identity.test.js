const assert = require('node:assert/strict');
const { test } = require('node:test');
const { verifyAdminIdentity, signAdminIdentity } = require('../src/api/v1/security/AdminIdentity');

const SECRET = 'ia-admin-shared-secret-test-vector-0123456789';
const NOW = 1700000000;
const EMAIL = 'shop@example.com';
const PATH = '/api/v1/admin/signing-keys/7/cart/enabled';

function request({ email = EMAIL, timestamp = String(NOW), method = 'PUT', url = `${PATH}?email=${EMAIL}`,
                   query = { email: EMAIL }, body = {}, signature } = {}) {
    const pathname = url.split('?')[0];
    return {
        method,
        originalUrl: url,
        query,
        body,
        headers: {
            'x-ia-admin-email': email,
            'x-ia-admin-timestamp': timestamp,
            'x-ia-admin-signature': signature ?? signAdminIdentity(SECRET, timestamp, email, method, pathname),
        },
    };
}

test('shared Node/PHP vector', () => {
    assert.equal(signAdminIdentity(SECRET, '1700000000', EMAIL, 'PUT', PATH),
        '30b8a7a17afb96be5354306e4cd9da1e23428d4144f83a34252df68655841ed5');
});

test('accepts a valid signed identity and returns the email', () => {
    assert.equal(verifyAdminIdentity(request(), SECRET, NOW), EMAIL);
    assert.equal(verifyAdminIdentity(request({ body: { email: EMAIL } }), SECRET, NOW + 300), EMAIL);
});

test('rejects a missing configuration (fail closed)', () => {
    assert.throws(() => verifyAdminIdentity(request(), undefined, NOW), /IA_ADMIN_SHARED_SECRET/);
    assert.throws(() => verifyAdminIdentity(request(), 'short', NOW), /IA_ADMIN_SHARED_SECRET/);
});

test('rejects missing headers, wrong key, tampering and expiry', () => {
    const req = request();
    delete req.headers['x-ia-admin-signature'];
    assert.throws(() => verifyAdminIdentity(req, SECRET, NOW), { status: 401 });
    assert.throws(() => verifyAdminIdentity(request(), SECRET + 'x', NOW), { status: 401 });
    assert.throws(() => verifyAdminIdentity(request({ timestamp: String(NOW - 301) }), SECRET, NOW), { status: 401 });

    const forged = request();
    forged.headers['x-ia-admin-email'] = 'other@example.com';
    assert.throws(() => verifyAdminIdentity(forged, SECRET, NOW), { status: 401 });

    const otherPath = request();
    otherPath.originalUrl = '/api/v1/admin/signing-keys/8/cart/enabled?email=' + EMAIL;
    assert.throws(() => verifyAdminIdentity(otherPath, SECRET, NOW), { status: 401 });

    const otherMethod = request();
    otherMethod.method = 'POST';
    assert.throws(() => verifyAdminIdentity(otherMethod, SECRET, NOW), { status: 401 });
});

test('rejects query/body email different from the signed one', () => {
    assert.throws(() => verifyAdminIdentity(request({ query: { email: 'other@example.com' } }), SECRET, NOW), { status: 403 });
    assert.throws(() => verifyAdminIdentity(request({ query: { email: [EMAIL, 'other@example.com'] } }), SECRET, NOW), { status: 403 });
    assert.throws(() => verifyAdminIdentity(request({ body: { email: 'other@example.com' } }), SECRET, NOW), { status: 403 });
});
