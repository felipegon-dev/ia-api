import { createHash } from 'crypto';
import { QueryTypes, Sequelize } from 'sequelize';
import db from '@config/database/models';
import { AppError } from '@src/errors/AppError';

export interface AttemptSnapshot {
    providerId: string;
    providerMetadata: string;
    redirectUrl: string;
    userPaymentMethodId: number;
    cartItems: string;
    addressItems: string;
    shippingDetails: string;
    amount: number;
    description: string;
}

interface AttemptRow {
    requestHash: string;
    snapshot: string | null;
    redirectUrl: string | null;
}

/** Persistent intent plus connection-scoped lock; provider results survive a retry. */
export class PaymentAttempt {
    private static locks: Sequelize;

    private static lockPool(): Sequelize {
        if (!this.locks) {
            const config = db.sequelize.config;
            const dialect = db.sequelize.getDialect();
            if (dialect !== 'mysql' && dialect !== 'mariadb') {
                throw new Error('Cart authorization locks require MySQL or MariaDB');
            }
            this.locks = new Sequelize({
                ...config, dialect, port: Number(config.port || 3306),
                password: config.password ?? undefined,
                dialectModulePath: config.dialectModulePath ?? undefined,
                pool: { min: 0, max: 2, idle: 10000, acquire: 20000 }, logging: false,
            });
        }
        return this.locks;
    }

    static async run(
        domainId: number, authorizationId: string, request: unknown,
        create: (idempotencyKey: string) => Promise<AttemptSnapshot>,
        persist: (snapshot: AttemptSnapshot, linkOrder: (orderId: number) => Promise<void>) => Promise<void>,
    ): Promise<string> {
        const requestHash = createHash('sha256').update(JSON.stringify(request)).digest('hex');
        const idempotencyKey = createHash('sha256').update(`${domainId}:${authorizationId}`).digest('hex').slice(0, 38);
        const lock = 'ia-cart-' + idempotencyKey;
        // Only GET_LOCK/RELEASE_LOCK use this connection; durable steps use autocommit.
        // A separate pool prevents lock holders exhausting the pool used for durable writes.
        const locks = this.lockPool();
        const connection = await locks.transaction();
        let acquired = false;
        try {
            const result = await locks.query<{ acquired: number }>(
                'SELECT GET_LOCK(:lock, 0) AS acquired',
                { replacements: { lock }, type: QueryTypes.SELECT, transaction: connection },
            );
            acquired = Number(result[0]?.acquired) === 1;
            if (!acquired) {
                throw new AppError('Cart authorization is being processed; retry the same request', 409, 'CART_AUTHORIZATION_BUSY');
            }
            const replacements = { domainId, authorizationId, requestHash };
            const rows = await db.sequelize.query<AttemptRow>(
                'SELECT requestHash, snapshot, redirectUrl FROM cartAuthorizations WHERE domainId=:domainId AND authorizationId=:authorizationId',
                { replacements, type: QueryTypes.SELECT },
            );
            const row = rows[0];
            if (row && row.requestHash !== requestHash) {
                throw new AppError('Cart authorization already used for a different payment', 409, 'CART_AUTHORIZATION_USED');
            }
            if (row?.redirectUrl) return row.redirectUrl;
            if (!row) {
                await db.sequelize.query(
                    'INSERT INTO cartAuthorizations (domainId, authorizationId, requestHash, createdAt) VALUES (:domainId,:authorizationId,:requestHash,NOW())',
                    { replacements },
                );
            }
            let snapshot: AttemptSnapshot;
            if (row?.snapshot) {
                snapshot = JSON.parse(row.snapshot);
            } else {
                snapshot = await create(idempotencyKey);
                await db.sequelize.query(
                    'UPDATE cartAuthorizations SET snapshot=:snapshot WHERE domainId=:domainId AND authorizationId=:authorizationId',
                    { replacements: { ...replacements, snapshot: JSON.stringify(snapshot) } },
                );
            }
            await persist(snapshot, async orderId => {
                if (!Number.isSafeInteger(orderId) || orderId < 1) {
                    throw new Error('Invalid payment order ID');
                }
                await db.sequelize.query(
                    'UPDATE cartAuthorizations SET orderId=:orderId WHERE domainId=:domainId AND authorizationId=:authorizationId',
                    { replacements: { ...replacements, orderId } },
                );
            });
            await db.sequelize.query(
                'UPDATE cartAuthorizations SET redirectUrl=:redirectUrl WHERE domainId=:domainId AND authorizationId=:authorizationId',
                { replacements: { ...replacements, redirectUrl: snapshot.redirectUrl } },
            );
            return snapshot.redirectUrl;
        } finally {
            try {
                if (acquired) {
                    await locks.query('SELECT RELEASE_LOCK(:lock)', {
                        replacements: { lock }, transaction: connection,
                    });
                }
            } finally {
                await connection.rollback();
            }
        }
    }
}
