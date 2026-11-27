import type { SigningKeyRow, SigningKeyWrite } from '@config/database/repository/DomainSigningKeyRepository';
import { AppError } from '@src/errors/AppError';
import { ValidationError } from '@src/errors/ValidationError';
import { toEpochSeconds } from '@src/services/security/SigningKeys';
import {
    CryptSource, generateKeyId, generateSigningSecret, resolveCrypt, SIGNING_KEY_PURPOSES, SigningKeyPurpose,
} from '@src/services/security/SigningKeyCrypto';

export const DEFAULT_ROTATION_GRACE_SECONDS = 300;
export const MIN_EXTENDED_GRACE_SECONDS = 600;
export const MAX_ROTATION_GRACE_SECONDS = 7 * 24 * 3600;

export interface SigningKeyStore {
    findAllByDomainIds(domainIds: number[]): Promise<SigningKeyRow[]>;
    mutate<T>(
        domainId: number,
        purpose: SigningKeyPurpose,
        fn: (current: SigningKeyRow | null) => { write: SigningKeyWrite | null; result: T },
    ): Promise<T>;
}

/** Public, secret-free view of a key slot. */
export interface SigningKeyStatus {
    domainId: number;
    purpose: SigningKeyPurpose;
    configured: boolean;
    enabled: boolean;
    keyId: string | null;
    previousKeyId: string | null;
    previousValidUntil: number | null;
}

/** Validates the rotation window: exactly 300 s, or 600 s … 7 days. */
export function parseGraceSeconds(value: unknown): number {
    if (value === undefined || value === null || value === '') return DEFAULT_ROTATION_GRACE_SECONDS;
    const n = typeof value === 'number' ? value : (/^\d+$/.test(String(value)) ? Number(value) : NaN);
    if (n === DEFAULT_ROTATION_GRACE_SECONDS ||
        (Number.isSafeInteger(n) && n >= MIN_EXTENDED_GRACE_SECONDS && n <= MAX_ROTATION_GRACE_SECONDS)) {
        return n;
    }
    throw new ValidationError(
        `graceSeconds must be ${DEFAULT_ROTATION_GRACE_SECONDS} or between ${MIN_EXTENDED_GRACE_SECONDS} and ${MAX_ROTATION_GRACE_SECONDS}`
    );
}

/** Admin operations on domain signing keys. Only `generate` ever returns a secret. */
export class SigningKeyManager {
    constructor(
        private readonly store: SigningKeyStore,
        private readonly crypt: CryptSource,
        private readonly now: () => number = () => Math.floor(Date.now() / 1000),
    ) {}

    async list(domainIds: number[]): Promise<SigningKeyStatus[]> {
        const rows = await this.store.findAllByDomainIds(domainIds);
        return domainIds.flatMap(domainId => SIGNING_KEY_PURPOSES.map(purpose =>
            this.status(domainId, purpose, rows.find(r => r.domainId === domainId && r.purpose === purpose) ?? null)));
    }

    /** Creates the first key or rotates: current key becomes previous for `graceSeconds`. */
    async generate(domainId: number, purpose: SigningKeyPurpose, graceSeconds = DEFAULT_ROTATION_GRACE_SECONDS)
        : Promise<{ status: SigningKeyStatus; secret: string }> {
        const grace = parseGraceSeconds(graceSeconds);
        const secret = generateSigningSecret();
        const keyId = generateKeyId(purpose);
        const encryptedSecret = resolveCrypt(this.crypt).encrypt(secret);

        const status = await this.store.mutate(domainId, purpose, current => {
            if (current && this.previousActive(current)) {
                throw new AppError('A previous key is still valid; retire it before rotating again', 409, 'CONFLICT');
            }
            const write: SigningKeyWrite = current
                ? {
                    enabled: Boolean(current.enabled),
                    keyId,
                    encryptedSecret,
                    previousKeyId: current.keyId,
                    previousEncryptedSecret: current.encryptedSecret,
                    previousValidUntil: new Date((this.now() + grace) * 1000),
                }
                : { enabled: false, keyId, encryptedSecret, previousKeyId: null, previousEncryptedSecret: null, previousValidUntil: null };
            return { write, result: this.status(domainId, purpose, { ...(current ?? {} as SigningKeyRow), domainId, purpose, ...write }) };
        });
        return { status, secret };
    }

    async setEnabled(domainId: number, purpose: SigningKeyPurpose, enabled: boolean): Promise<SigningKeyStatus> {
        return this.store.mutate(domainId, purpose, current => {
            if (!current) {
                if (enabled) throw new AppError('Generate a key before enabling signatures', 409, 'CONFLICT');
                return { write: null, result: this.status(domainId, purpose, null) };
            }
            const write = { enabled, keyId: current.keyId, encryptedSecret: current.encryptedSecret };
            return { write, result: this.status(domainId, purpose, { ...current, enabled }) };
        });
    }

    async retirePrevious(domainId: number, purpose: SigningKeyPurpose): Promise<SigningKeyStatus> {
        return this.store.mutate(domainId, purpose, current => {
            if (!current) return { write: null, result: this.status(domainId, purpose, null) };
            const write: SigningKeyWrite = {
                enabled: Boolean(current.enabled), keyId: current.keyId, encryptedSecret: current.encryptedSecret,
                previousKeyId: null, previousEncryptedSecret: null, previousValidUntil: null,
            };
            return { write, result: this.status(domainId, purpose, { ...current, ...write }) };
        });
    }

    private previousActive(row: Pick<SigningKeyRow, 'previousKeyId' | 'previousValidUntil'>): boolean {
        const until = toEpochSeconds(row.previousValidUntil);
        return Boolean(row.previousKeyId) && until !== null && until > this.now();
    }

    private status(domainId: number, purpose: SigningKeyPurpose, row: SigningKeyRow | null): SigningKeyStatus {
        const active = row ? this.previousActive(row) : false;
        return {
            domainId,
            purpose,
            configured: Boolean(row?.keyId),
            enabled: Boolean(row?.enabled),
            keyId: row?.keyId ?? null,
            previousKeyId: active ? row!.previousKeyId ?? null : null,
            previousValidUntil: active ? toEpochSeconds(row!.previousValidUntil) : null,
        };
    }
}
