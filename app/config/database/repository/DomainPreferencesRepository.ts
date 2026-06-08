import db from "@config/database/models";
import { DomainPreferencesAttributes } from "@config/database/models";

export default class DomainPreferencesRepository {
    private DomainPreferences = db.DomainPreferences;

    /** @deprecated — use findByEmail instead */
    async findFirst(): Promise<DomainPreferencesAttributes | null> {
        const result = await (this.DomainPreferences as any).findOne({
            order: [['id', 'ASC']],
        });
        return result ? (result.get({ plain: true }) as DomainPreferencesAttributes) : null;
    }

    async findByEmail(email: string): Promise<DomainPreferencesAttributes | null> {
        const user = await (db.User as any).findOne({
            where: { email },
            include: [{
                model: db.UserDomain,
                as: 'domains',
                include: [{ model: db.DomainPreferences, as: 'preferences' }],
            }],
        });
        if (!user) return null;
        const domains: any[] = user.domains ?? [];
        if (domains.length === 0) return null;
        const prefs = domains[0].preferences;
        return prefs ? (prefs.get({ plain: true }) as DomainPreferencesAttributes) : null;
    }

    async updateByEmail(email: string, url: string | null): Promise<DomainPreferencesAttributes | null> {
        const prefs = await this.findByEmail(email);
        if (!prefs) return null;
        await (this.DomainPreferences as any).update(
            { callbackPaymentsUrl: url },
            { where: { id: prefs.id } }
        );
        return this.findByEmail(email);
    }

    /** @deprecated — use updateByEmail instead */
    async updateCallbackPaymentsUrl(id: number, url: string | null): Promise<DomainPreferencesAttributes | null> {
        await (this.DomainPreferences as any).update(
            { callbackPaymentsUrl: url },
            { where: { id } }
        );
        const result = await (this.DomainPreferences as any).findOne({ where: { id } });
        return result ? (result.get({ plain: true }) as DomainPreferencesAttributes) : null;
    }
}
