import { Request, Response } from 'express';
import { UniqueConstraintError } from 'sequelize';
import UserDomainRepository from '@config/database/repository/UserDomainRepository';
import UserRepository from '@config/database/repository/UserRepository';
import { UserAttributes, UserDomainAttributes } from '@config/database/models';

export class AdminDomainController {
    constructor(
        private readonly users: UserRepository,
        private readonly domains: UserDomainRepository,
    ) {}

    /** POST /api/v1/admin/domains — create an account/domain for a verified website identity. */
    create = async (req: Request, res: Response) => {
        const domain = String(req.body?.domain ?? '').trim().toLowerCase();
        const name = String(req.body?.name ?? '').trim().slice(0, 255);
        const email = res.locals.adminEmail as string;

        if (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/i.test(domain)) {
            res.status(400).json({ success: false, message: 'A valid domain name is required' });
            return;
        }

        const existing = await this.domains.findByDomain(domain);
        if (existing) {
            const existingData = existing.get({ plain: true }) as UserDomainAttributes;
            const owner = await this.users.findById(existingData.userId);
            const ownerData = owner?.get({ plain: true }) as UserAttributes | undefined;
            if (ownerData?.email.toLowerCase() !== email.toLowerCase()) {
                res.status(409).json({ success: false, message: 'This domain is already connected to another account' });
                return;
            }

            res.status(200).json({
                success: true,
                data: { id: existingData.id, domain: existingData.domain },
            });
            return;
        }

        const user = await this.users.ensureForVerifiedEmail(email, name || email);
        const userData = user.get({ plain: true }) as UserAttributes;

        try {
            const created = await this.domains.create(userData.id, domain);
            const createdData = created.get({ plain: true }) as UserDomainAttributes;
            res.status(201).json({
                success: true,
                data: { id: createdData.id, domain: createdData.domain },
            });
        } catch (error) {
            if (!(error instanceof UniqueConstraintError)) throw error;

            const concurrentDomain = await this.domains.findByDomain(domain);
            if (!concurrentDomain) throw error;

            const concurrentData = concurrentDomain.get({ plain: true }) as UserDomainAttributes;
            if (concurrentData.userId !== userData.id) {
                res.status(409).json({ success: false, message: 'This domain is already connected to another account' });
                return;
            }

            res.status(200).json({
                success: true,
                data: { id: concurrentData.id, domain: concurrentData.domain },
            });
        }
    };
}
