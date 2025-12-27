export default class Url {

    public removeParamsFromUrl(url: string): string {
        return url.split('?')[0];
    }

    /**
     * Normaliza un host o URL:
     * - elimina protocolo
     * - elimina puerto
     * - lowercase
     * - elimina trailing slash
     */
    normalizeHost(input: string): string {
        if (!input) return '';

        let host = input.trim().toLowerCase();

        // Si es URL completa, usamos URL API
        try {
            if (!host.startsWith('http')) {
                host = `http://${host}`;
            }
            host = new URL(host).host;
        } catch {
            return '';
        }

        // quitar puerto si existe
        return host.replace(/:\d+$/, '');
    }

    /**
     * Comprueba si un host coincide con un dominio permitido
     * - permite subdominios reales
     * - evita eviltest.com vs test.com
     */
    matchDomain(host: string, allowedDomain: string): boolean {
        const h = this.normalizeHost(host);
        const d = this.normalizeHost(allowedDomain);

        if (!h || !d) return false;

        return h === d || h.endsWith(`.${d}`);
    }

    /**
     * Extrae el dominio raíz (opcional)
     * ej: blog.test.com -> test.com
     * ⚠️ No usar para seguridad sin PSL
     */
    getRootDomain(host: string): string {
        const parts = this.normalizeHost(host).split('.');
        if (parts.length <= 2) return parts.join('.');
        return parts.slice(-2).join('.');
    }
}
