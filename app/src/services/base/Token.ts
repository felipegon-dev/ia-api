import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import { UnauthorizedError } from "@errors/UnauthorizedError";
import { HEADERS } from "@config/headers";
import UserData from "@services/base/UserData";
// @ts-ignore
import type { TokenPayload } from '@services/base/TokenPayload'

/**
 * todo: nueva idea:
 * 1- SPA -> generar token API
 * 2- SPA guardar en local storage
 * 3- SPA envia peticion de user get con token
 *  + si ok regresa resultado
 *  + si falla regresa unauthorized
 * 4- SPA -> antes de hacer cualquier peticion mira si el token ha expirado y solicita renovarlo
 */
class Token {
    private expiresIn = process.env.TOKEN_EXPIRATION || '10m';
    private algorithm = 'aes-256-gcm';

    constructor(private userData: UserData) {}

    /**
     * Valida que el token existe, es válido y coincide con el fingerprint
     */
    public validate(req: Request): TokenPayload {
        const token = req.headers[HEADERS.TOKEN_API] as string | null;
        if (!token) throw new UnauthorizedError("Token not found");

        // 1️⃣ Descifrar el token si aplica
        const jwtToken = this.decryptToken(token);

        // 2️⃣ Verificar la firma
        const decoded = this.verifyJwt(jwtToken);
        if (!decoded) throw new UnauthorizedError("Invalid token signature");

        // 3️⃣ Castear correctamente a TokenPayload
        const tokenPayload = decoded as TokenPayload;

        // 4️⃣ Obtener datos actuales de la request
        const currentUserData = this.userData.get(req, {} as Response);

        // 5️⃣ Comparar fingerprint
        if (!this.matchFingerprint(tokenPayload.fp, currentUserData)) {
            throw new UnauthorizedError("Fingerprint mismatch");
        }

        return tokenPayload;
    }

    /**
     * Genera un token nuevo usando los datos de la request
     */
    public get(req: Request, res: Response): string {
        // todo validate source
        const tokenPayload = this.getTokenPayload(req, res);
        return this.generateToken(tokenPayload);
    }

    /**
     * Obtiene TokenPayload actual a partir de la request
     */
    public getTokenPayload(req: Request, res: Response): TokenPayload {
        const user = this.userData.get(req, res);

        return {
            userId: user.userId,
            fp: {
                userAgent: user.srvUserAgent,
                forwardedFor: user.forwardedFor,
                realIp: user.realIp,
                srvUserAgent: user.srvUserAgent,
                srvHost: user.srvHost,
                srvReferer: user.srvReferer,
                timezone: user.timezone,
                platform: user.platform,
                host: user.host,
            }
        };
    }

    private decryptToken(token: string): string {
        if (!this.isEncryptionEnabled()) return token;

        const [ivB64, authTagB64, encrypted] = token.split('.');
        if (!ivB64 || !authTagB64 || !encrypted) throw new UnauthorizedError('Invalid token format');

        const decipher = crypto.createDecipheriv(this.algorithm, this.getEncryptionKey(), Buffer.from(ivB64, 'base64'));
        decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

        return decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8');
    }

    private verifyJwt(jwtToken: string): JwtPayload | null {
        try {
            return jwt.verify(jwtToken, this.getJWTSecret()) as JwtPayload;
        } catch {
            return null;
        }
    }

    private matchFingerprint(tokenFp: TokenPayload['fp'], reqData: ReturnType<UserData['get']>): boolean {
        // User-Agent del servidor
        if (tokenFp.srvUserAgent !== reqData.srvUserAgent) return false;

        // IPs: verificamos forwardedFor y realIp por separado
        if (tokenFp.forwardedFor && tokenFp.forwardedFor !== reqData.forwardedFor) return false;
        if (tokenFp.realIp && tokenFp.realIp !== reqData.realIp) return false;

        // Campos opcionales
        if (tokenFp.platform !== reqData.platform) return false;
        if (tokenFp.timezone && tokenFp.timezone !== reqData.timezone) return false;

        // Hosts: srvHost y host por separado
        if (tokenFp.srvHost && tokenFp.srvHost !== reqData.srvHost) return false;
        if (tokenFp.host && tokenFp.host !== reqData.host) return false;

        // Verificar que srvReferer y host sean iguales si existen
        if (tokenFp.srvReferer && reqData.srvReferer && tokenFp.srvReferer !== reqData.srvReferer) return false;
        if (tokenFp.host && reqData.host && tokenFp.host !== reqData.host) return false;

        return true;
    }


    private generateToken(data: object): string {
        // @ts-ignore
        const jwtToken = jwt.sign(data, this.getJWTSecret(), { expiresIn: this.expiresIn });

        if (!this.isEncryptionEnabled()) return jwtToken;

        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.algorithm, this.getEncryptionKey(), iv);

        let encrypted = cipher.update(jwtToken, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const authTag = cipher.getAuthTag().toString('base64');
        return `${iv.toString('base64')}.${authTag}.${encrypted}`;
    }

    private isEncryptionEnabled(): boolean {
        return process.env.TOKEN_ENCRYPTION_ENABLED === 'true';
    }

    private getJWTSecret(): string {
        if (!process.env.JWT_SECRET) throw new UnauthorizedError('JWT_SECRET is not defined');
        return process.env.JWT_SECRET;
    }

    private getEncryptionKey(): Buffer {
        if (!process.env.TOKEN_ENCRYPTION_SECRET) throw new UnauthorizedError('TOKEN_ENCRYPTION_SECRET is not defined');
        return Buffer.from(process.env.TOKEN_ENCRYPTION_SECRET, 'utf8');
    }
}

export default Token
