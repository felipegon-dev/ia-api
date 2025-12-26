import { Request } from "express";
import { HEADERS } from "@config/constants/headers";
import { decompressFromEncodedURIComponent } from "lz-string";
import { ValidationError } from "@application/errors/ValidationError";

export interface UserDataPayload {
    userId?: string;
    ip?: string;
    forwardedFor?: string;
    realIp?: string;
    srvUserAgent?: string;
    srvHost?: string;
    srvReferer?: string;
    timezone?: string;
    platform?: string;
    host?: string;
    // agrega más campos si vienen de jsUserData
    [key: string]: any; // opcional, para no perder jsUserData dinámico
}

export default class UserData {

    private data: UserDataPayload | null = null;

    /**
     * Desofusca y construye los datos del usuario combinando:
     * - User data ofuscado enviado en headers
     * - Información del servidor
     */
    public set = (req: Request): UserData => {
        let headerValue = req.headers[HEADERS.USER_DATA] as string || '';

        headerValue = headerValue.trim();

        // quitar comillas dobles si vienen
        if (headerValue.startsWith('"') && headerValue.endsWith('"')) {
            headerValue = headerValue.slice(1, -1);
        }

        let jsUserData: Record<string, any> = {};

        if (headerValue) {
            try {
                const json = decompressFromEncodedURIComponent(headerValue);
                if (json) {
                    jsUserData = JSON.parse(json);
                }
            } catch {
                jsUserData = {};
            }
        }

        const data: UserDataPayload = {
            ...jsUserData,
            ip: req.ip,
            forwardedFor: req.headers[HEADERS.FORWARDED_FOR] as string,
            realIp: req.headers[HEADERS.REAL_IP] as string,
            srvUserAgent: req.headers[HEADERS.USER_AGENT] as string,
            srvHost: req.headers[HEADERS.HOST] as string,
            srvReferer: (() => {
                const referer = req.headers[HEADERS.REFERER] as string || '';
                try {
                    return new URL(referer).host;
                } catch {
                    return '';
                }
            })(),
        };

        this.data = data;

        return this;
    };

    public get(): UserDataPayload {
        if (!this.data) throw new ValidationError('UserData not set');
        return this.data;
    }
}
