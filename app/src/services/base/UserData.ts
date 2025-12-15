import { Request, Response } from "express";
import { HEADERS } from "@config/headers";
import { decompressFromEncodedURIComponent } from "lz-string";

export default class UserData {

    /**
     * Desofusca y construye los datos del usuario combinando:
     * - User data ofuscado enviado en headers
     * - Información del servidor
     */
    public get = (req: Request, res: Response): object => {

        const headerValue = req.headers[HEADERS.USER_DATA] as string || '';

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

        const data = {
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

        return data;
    };
}
