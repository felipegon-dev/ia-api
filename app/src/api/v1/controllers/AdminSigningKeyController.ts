import { Request, Response } from 'express';
import UserDomainRepository from '@config/database/repository/UserDomainRepository';
import { SigningKeyManager } from '@src/services/security/SigningKeyManager';
import { isSigningKeyPurpose, SigningKeyPurpose } from '@src/services/security/SigningKeyCrypto';
import { ValidationError } from '@src/errors/ValidationError';
import { NotFoundError } from '@src/errors/NotFoundError';
import logger from '@src/util/logger';

type DomainOwnership = Pick<UserDomainRepository, 'findAllByEmail' | 'findOwnedByEmail'>;

/** Per-domain HMAC key management. Email always comes from the verified admin identity. */
export class AdminSigningKeyController {
    constructor(
        private readonly manager: SigningKeyManager,
        private readonly domains: DomainOwnership,
    ) {}

    /** GET /api/v1/admin/signing-keys?email=... */
    list = async (_req: Request, res: Response) => {
        const domains = await this.domains.findAllByEmail(res.locals.adminEmail);
        const keys = await this.manager.list(domains.map(d => d.id));
        res.set('Cache-Control', 'no-store');
        res.status(200).json({
            success: true,
            data: domains.map(d => ({ ...d, keys: keys.filter(k => k.domainId === d.id) })),
        });
    };

    /** POST /api/v1/admin/signing-keys/:domainId/:purpose/generate?email=...  body: { graceSeconds? } */
    generate = async (req: Request, res: Response) => {
        const { domainId, purpose } = await this.target(req, res);
        const { status, secret } = await this.manager.generate(domainId, purpose, req.body?.graceSeconds);
        logger.info({ domainId, purpose, keyId: status.keyId, rotated: Boolean(status.previousKeyId) }, 'Admin: signing key generated');
        res.set('Cache-Control', 'no-store');
        res.status(201).json({ success: true, data: { ...status, secret } });
    };

    /** PUT /api/v1/admin/signing-keys/:domainId/:purpose/enabled?email=...  body: { enabled } */
    setEnabled = async (req: Request, res: Response) => {
        const { domainId, purpose } = await this.target(req, res);
        const enabled = req.body?.enabled;
        if (typeof enabled !== 'boolean') throw new ValidationError('enabled must be a boolean');
        const status = await this.manager.setEnabled(domainId, purpose, enabled);
        logger.info({ domainId, purpose, enabled }, 'Admin: signing key mode changed');
        res.status(200).json({ success: true, data: status });
    };

    /** POST /api/v1/admin/signing-keys/:domainId/:purpose/retire-previous?email=... */
    retirePrevious = async (req: Request, res: Response) => {
        const { domainId, purpose } = await this.target(req, res);
        const status = await this.manager.retirePrevious(domainId, purpose);
        logger.info({ domainId, purpose }, 'Admin: previous signing key retired');
        res.status(200).json({ success: true, data: status });
    };

    private async target(req: Request, res: Response): Promise<{ domainId: number; purpose: SigningKeyPurpose }> {
        const rawId = String(req.params.domainId);
        const purpose = req.params.purpose;
        if (!/^\d{1,10}$/.test(rawId)) throw new ValidationError('Invalid domainId');
        if (!isSigningKeyPurpose(purpose)) throw new ValidationError("purpose must be 'cart' or 'callback'");
        const domain = await this.domains.findOwnedByEmail(Number(rawId), res.locals.adminEmail);
        if (!domain) throw new NotFoundError('Domain not found');
        return { domainId: domain.id, purpose };
    }
}
