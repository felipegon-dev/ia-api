import db, { DomainSigningKeyAttributes, SigningKeyPurpose } from "@config/database/models";
import { AppError } from "@src/errors/AppError";

function isConcurrentWrite(err: any): boolean {
    return err?.name === 'SequelizeUniqueConstraintError' ||
        ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(err?.parent?.code ?? err?.original?.code);
}

export type SigningKeyRow = DomainSigningKeyAttributes;
export type SigningKeyWrite = Pick<DomainSigningKeyAttributes,
    'enabled' | 'keyId' | 'encryptedSecret'> & Partial<Pick<DomainSigningKeyAttributes,
    'previousKeyId' | 'previousEncryptedSecret' | 'previousValidUntil'>>;

/** Persistence only: secrets stay encrypted at this layer. */
export default class DomainSigningKeyRepository {
    private DomainSigningKey = db.DomainSigningKey as any;

    async findByDomainAndPurpose(domainId: number, purpose: SigningKeyPurpose): Promise<SigningKeyRow | null> {
        const row = await this.DomainSigningKey.findOne({ where: { domainId, purpose } });
        return row ? (row.get({ plain: true }) as SigningKeyRow) : null;
    }

    async findAllByDomainIds(domainIds: number[]): Promise<SigningKeyRow[]> {
        if (domainIds.length === 0) return [];
        const rows = await this.DomainSigningKey.findAll({ where: { domainId: domainIds } });
        return rows.map((r: any) => r.get({ plain: true }) as SigningKeyRow);
    }

    /**
     * Runs `fn` with the current row locked (SELECT … FOR UPDATE) and persists
     * whatever it returns, so concurrent rotations cannot lose the previous key.
     */
    async mutate<T>(
        domainId: number,
        purpose: SigningKeyPurpose,
        fn: (current: SigningKeyRow | null) => { write: SigningKeyWrite | null; result: T },
    ): Promise<T> {
        return db.sequelize.transaction(async (transaction: any) => {
            const row = await this.DomainSigningKey.findOne({
                where: { domainId, purpose },
                lock: transaction.LOCK.UPDATE,
                transaction,
            });
            const { write, result } = fn(row ? (row.get({ plain: true }) as SigningKeyRow) : null);
            if (write) {
                if (row) {
                    await row.update(write, { transaction });
                } else {
                    await this.DomainSigningKey.create({ domainId, purpose, ...write }, { transaction });
                }
            }
            return result;
        }).catch((err: any) => {
            if (isConcurrentWrite(err)) {
                throw new AppError('Signing key was modified concurrently; reload and retry', 409, 'CONFLICT');
            }
            throw err;
        });
    }
}
