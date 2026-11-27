import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { ValidationError } from '@src/errors/ValidationError';
import { AppError } from '@src/errors/AppError';

export interface SigningKey {
    enabled: boolean;
    keyId: string;
    secret: string;
    previousKeyId?: string;
    previousSecret?: string;
    previousValidUntil?: number;
}

export interface AuthorizedItem {
    id: string;
    title: string;
    priceMinor: number;
    lineTotalMinor: number;
    quantity: number;
    image: string;
    url: string;
}

export interface CartAuthorization {
    version: 1;
    keyId: string;
    merchant: string;
    domain: string;
    authorizationId: string;
    issuedAt: number;
    expiresAt: number;
    currency: string;
    items: AuthorizedItem[];
}

const safeId = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

export function moneyMinor(value: unknown): number {
    if ((typeof value !== 'number' && typeof value !== 'string') ||
        !/^\d{1,10}(?:\.\d{1,2})?$/.test(String(value))) {
        throw new ValidationError('Invalid monetary amount');
    }
    const [whole, fraction = ''] = String(value).split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function callbackHeaders(
    body: string, key: SigningKey, event: string, providerId: string,
    timestamp = Math.floor(Date.now() / 1000),
): Record<string, string> {
    if (!safeId(key.keyId) || key.secret.length < 32) {
        throw new ValidationError('Callback signing key is not configured');
    }
    const eventId = createHash('sha256').update(`${event}:${providerId}`).digest('hex');
    const message = `v1\n${key.keyId}\n${eventId}\n${timestamp}\n${body}`;
    return {
        'X-IA-Key-Id': key.keyId, 'X-IA-Event-Id': eventId,
        'X-IA-Timestamp': String(timestamp),
        'X-IA-Signature': 'v1=' + createHmac('sha256', key.secret).update(message).digest('hex'),
    };
}

export function verifyCart(
    envelope: unknown, key: SigningKey, merchant: string, domain: string,
    now = Math.floor(Date.now() / 1000),
): CartAuthorization {
    if (!envelope || typeof envelope !== 'object' ||
        !('payload' in envelope) || !('signature' in envelope) ||
        typeof envelope.payload !== 'string' || envelope.payload.length > 200000 ||
        !/^[A-Za-z0-9_-]+$/.test(envelope.payload) ||
        typeof envelope.signature !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.signature)) {
        throw new AppError('Cart authorization is required or malformed', 400, 'CART_AUTHORIZATION_INVALID');
    }
    let data: CartAuthorization;
    try {
        data = JSON.parse(Buffer.from(envelope.payload, 'base64url').toString('utf8'));
    } catch {
        throw new AppError('Invalid cart authorization payload', 400, 'CART_AUTHORIZATION_INVALID');
    }
    const secret = data?.keyId === key.keyId ? key.secret :
        data?.keyId === key.previousKeyId && (key.previousValidUntil ?? 0) >= now ? key.previousSecret : undefined;
    if (!secret || secret.length < 32) {
        throw new AppError('Unknown or expired cart signing key', 400, 'CART_AUTHORIZATION_UNKNOWN_KEY');
    }
    const expected = createHmac('sha256', secret).update('ia-cart-authorization.v1.' + envelope.payload).digest();
    if (!timingSafeEqual(expected, Buffer.from(envelope.signature, 'hex'))) {
        throw new AppError('Invalid cart authorization signature', 400, 'CART_AUTHORIZATION_INVALID_SIGNATURE');
    }
    if (Number.isSafeInteger(data.expiresAt) && data.expiresAt <= now) {
        throw new AppError('Cart authorization has expired', 400, 'CART_AUTHORIZATION_EXPIRED');
    }
    if (data.version !== 1 || data.merchant !== merchant || data.domain !== domain.toLowerCase() ||
        !safeId(data.authorizationId) || !Number.isSafeInteger(data.issuedAt) ||
        !Number.isSafeInteger(data.expiresAt) || data.issuedAt > now + 30 ||
        data.expiresAt <= now || data.expiresAt <= data.issuedAt || data.expiresAt - data.issuedAt > 600 ||
        data.currency !== 'EUR' || !Array.isArray(data.items) || !data.items.length || data.items.length > 200) {
        throw new AppError('Cart authorization scope or expiry is invalid', 400, 'CART_AUTHORIZATION_SCOPE_INVALID');
    }
    const ids = new Set<string>();
    let total = 0;
    for (const item of data.items) {
        if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 128 || ids.has(item.id) ||
            typeof item.title !== 'string' || !item.title || item.title.length > 500 ||
            typeof item.image !== 'string' || typeof item.url !== 'string' ||
            !Number.isSafeInteger(item.quantity) || item.quantity < 1 ||
            !Number.isSafeInteger(item.priceMinor) || item.priceMinor < 0 ||
            !Number.isSafeInteger(item.lineTotalMinor) ||
            item.lineTotalMinor !== item.priceMinor * item.quantity) {
            throw new AppError('Invalid authorized cart line', 400, 'CART_AUTHORIZATION_INVALID');
        }
        ids.add(item.id);
        total += item.lineTotalMinor;
    }
    if (!Number.isSafeInteger(total) || total < 1 || total > 999999999999) {
        throw new AppError('Authorized cart total is outside supported limits', 400, 'CART_AUTHORIZATION_INVALID');
    }
    return data;
}
