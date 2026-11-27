import db from "@config/database/models"; // tu index.js de Sequelize

export default class UserDomainRepository {
    private UserDomain = db.UserDomain;

    /**
     * Crear un nuevo domain para un usuario
     * @param userId - id del usuario
     * @param domain - nombre del domain
     */
    public async create(userId: number, domain: string) {
        return this.UserDomain.create({ userId, domain });
    }

    /**
     * Obtener todos los domains de un usuario
     * @param userId - id del usuario
     */
    public async findAllByUser(userId: number) {
        return this.UserDomain.findAll({ where: { userId } });
    }

    /**
     * Obtener un domain por su nombre
     * @param domain - nombre del domain
     */
    public async findByDomain(domain: string) {
        return this.UserDomain.findOne({ where: { domain } });
    }

    /**
     * Eliminar un domain por id
     * @param id - id del registro
     */
    public async deleteById(id: number): Promise<boolean> {
        const deleted = await this.UserDomain.destroy({ where: { id } });
        return deleted > 0;
    }

    /**
     * Dominios del usuario identificado por email (solo id y nombre)
     */
    public async findAllByEmail(email: string): Promise<{ id: number; domain: string }[]> {
        const rows = await (this.UserDomain as any).findAll({
            attributes: ['id', 'domain'],
            include: [{ model: db.User, as: 'user', attributes: [], where: { email }, required: true }],
            order: [['id', 'ASC']],
        });
        return rows.map((r: any) => ({ id: r.get('id'), domain: r.get('domain') }));
    }

    /**
     * Dominio `domainId` solo si pertenece al usuario con ese email
     */
    public async findOwnedByEmail(domainId: number, email: string): Promise<{ id: number; domain: string } | null> {
        const domains = await this.findAllByEmail(email);
        return domains.find(d => d.id === domainId) ?? null;
    }
}
