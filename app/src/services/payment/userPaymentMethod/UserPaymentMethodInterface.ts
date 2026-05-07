/**
 * Define quién puede acceder a cada método del UserPaymentMethod.
 *
 * Accesos definidos:
 *  - 'token'      → petición autenticada mediante JWT token (ia-apps widget)
 *  - 'ia-website' → petición interna desde el servidor Laravel (ia-website)
 */
export type AllowedAccessor = 'token' | 'ia-website';

export const ACCESSOR_TOKEN: AllowedAccessor = 'token';
export const ACCESSOR_IA_WEBSITE: AllowedAccessor = 'ia-website';

export interface UserPaymentMethodInterface {
    /**
     * Define quién puede acceder a cada método.
     * get:  por defecto ['ia-website']; Transfer añade 'token'
     * save: siempre ['ia-website']
     */
    allowedAccess(): {
        get: AllowedAccessor[];
        save: AllowedAccessor[];
    };

    /**
     * Obtiene las credenciales descifradas del método de pago.
     * Acceso: según allowedAccess().get
     */
    get(email: string, paymentMethodCode?: string): Promise<Record<string, any> | null>;

    /**
     * Devuelve la información pública del método de pago (sin datos sensibles).
     * Por defecto elimina el campo `paymentToken` del resultado de get().
     * Transfer sobreescribe para incluir iban e issuer.
     */
    getFiltered(email: string, paymentMethodCode?: string): Promise<Record<string, any> | null>;

    /**
     * Guarda/actualiza las credenciales del método de pago.
     * Acceso: según allowedAccess().save → ['ia-website']
     */
    save(email: string, data: Record<string, any>): Promise<{ success: boolean }>;
}