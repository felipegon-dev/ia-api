import DomainSigningKeyRepository, { SigningKeyRow } from '@config/database/repository/DomainSigningKeyRepository';
import type { SigningKey } from '@src/services/security/HmacProtocol';
import { createSigningKeyCrypt, CryptSource, resolveCrypt, SigningKeyPurpose } from '@src/services/security/SigningKeyCrypto';

export type { SigningKey } from '@src/services/security/HmacProtocol';
export type { SigningKeyPurpose } from '@src/services/security/SigningKeyCrypto';

export interface SigningKeyReader {
    findByDomainAndPurpose(domainId: number, purpose: SigningKeyPurpose): Promise<SigningKeyRow | null>;
}

/**
 * Read-only access to decrypted per-domain HMAC keys for the payment core.
 * Never log or serialise the returned object.
 */
export class SigningKeys {
    constructor(
        private readonly repository: SigningKeyReader = new DomainSigningKeyRepository(),
        private readonly crypt: CryptSource = () => createSigningKeyCrypt(),
        private readonly now: () => number = () => Math.floor(Date.now() / 1000),
    ) {}

    /**
     * Returns null when the domain has no key for `purpose` (legacy mode); this
     * path does not need HMAC_ENCRYPTION_SECRET. When a key exists, a missing
     * master secret or undecryptable ciphertext throws, so callers never fall back to legacy.
     * The previous key is only included while its rotation window is open.
     */
    async find(domainId: number, purpose: SigningKeyPurpose): Promise<SigningKey | null> {
        const row = await this.repository.findByDomainAndPurpose(domainId, purpose);
        if (!row || !row.keyId || !row.encryptedSecret) return null;

        const key: SigningKey = {
            enabled: Boolean(row.enabled),
            keyId: row.keyId,
            secret: this.decrypt(row.encryptedSecret),
        };

        const previousValidUntil = toEpochSeconds(row.previousValidUntil);
        if (row.previousKeyId && row.previousEncryptedSecret &&
            previousValidUntil !== null && previousValidUntil > this.now()) {
            key.previousKeyId = row.previousKeyId;
            key.previousSecret = this.decrypt(row.previousEncryptedSecret);
            key.previousValidUntil = previousValidUntil;
        }
        return key;
    }

    private decrypt(encrypted: string): string {
        const crypt = resolveCrypt(this.crypt);
        try {
            return crypt.decrypt(encrypted);
        } catch {
            throw new Error('Unable to decrypt domain signing key');
        }
    }
}

export function toEpochSeconds(value: Date | string | null | undefined): number | null {
    if (!value) return null;
    const ms = new Date(value).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

export default SigningKeys;
