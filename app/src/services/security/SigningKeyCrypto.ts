import crypto from 'crypto';
import { Crypt } from '@src/services/base/Crypt';

export type SigningKeyPurpose = 'cart' | 'callback';
export const SIGNING_KEY_PURPOSES: readonly SigningKeyPurpose[] = ['cart', 'callback'];

export function isSigningKeyPurpose(value: unknown): value is SigningKeyPurpose {
    return typeof value === 'string' && (SIGNING_KEY_PURPOSES as readonly string[]).includes(value);
}

/** A cipher, or a factory resolved only when a secret must be encrypted/decrypted. */
export type CryptSource = Crypt | (() => Crypt);

export function resolveCrypt(source: CryptSource): Crypt {
    return typeof source === 'function' ? source() : source;
}

/** Cipher for secrets at rest. HMAC_ENCRYPTION_SECRET is mandatory whenever a key is stored or read. */
export function createSigningKeyCrypt(secret = process.env.HMAC_ENCRYPTION_SECRET): Crypt {
    if (!secret || secret.length < 32) {
        throw new Error('HMAC_ENCRYPTION_SECRET is required (at least 32 characters)');
    }
    return new Crypt('aes-256-gcm', secret);
}

/** 32 random bytes as base64url; HMAC consumers use this string's UTF-8 bytes as key. */
export function generateSigningSecret(): string {
    return crypto.randomBytes(32).toString('base64url');
}

export function generateKeyId(purpose: SigningKeyPurpose): string {
    return `${purpose}_${crypto.randomBytes(8).toString('hex')}`;
}
