import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { UnauthorizedError } from "@src/errors/UnauthorizedError";
import { HEADERS } from "@config/constants/headers";
import UserData, { UserDataPayload } from "@src/services/base/UserData";
import { Crypt } from "@src/services/base/Crypt";

// @ts-ignore
import type { TokenPayload } from '@src/services/base/TokenPayload';
import {ValidationError} from "@src/errors/ValidationError";

/**
 * 1- SPA -> generar token API
 * 2- SPA guardar en local storage
 * 3- SPA envia peticion de user get con token
 *  + si ok regresa resultado
 *  + si falla regresa unauthorized
 * 4- SPA -> antes de hacer cualquier peticion mira si el token ha expirado y solicita renovarlo
 */
class Token {
    private expiresIn: string;
    private crypt: Crypt;

    constructor(private userData: UserData) {
        const expires = process.env.TOKEN_EXPIRATION;
        if (!expires) throw new ValidationError('TOKEN_EXPIRATION is not defined');
        this.expiresIn = expires;

        const algorithm = process.env.TOKEN_ALGORITHM;
        if (!algorithm) throw new ValidationError('TOKEN_ALGORITHM is not defined');

        const key = process.env.TOKEN_ENCRYPTION_SECRET;
        if (!key) throw new ValidationError('TOKEN_ENCRYPTION_SECRET is not defined');

        this.crypt = new Crypt(algorithm, key);
    }

    /**
     * Validates that the token exists, is valid, and fingerprint matches
     */
    public validate(req: Request): TokenPayload {
        const token = req.headers[HEADERS.TOKEN_API] as string | null;
        if (!token) throw new UnauthorizedError("Token not found");

        const jwtToken = this.isEncryptionEnabled() ? this.crypt.decrypt(token) : token;
        const decoded = this.verifyJwt(jwtToken);
        if (!decoded) throw new UnauthorizedError("Invalid token signature");

        const tokenPayload = decoded as TokenPayload;
        const currentUserData = this.userData.set(req).get();

        if (!this.matchFingerprint(tokenPayload.fp, currentUserData)) {
            throw new UnauthorizedError("Fingerprint mismatch");
        }

        return tokenPayload;
    }

    /**
     * Generates a new token based on the request
     */
    public get(req: Request, res: Response): string {
        const tokenPayload = this.getTokenPayload(req);
        return this.generateToken(tokenPayload);
    }

    /**
     * Extract TokenPayload from request
     */
    public getTokenPayload(req: Request): TokenPayload {
        const user = this.userData.set(req).get();

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

    /**
     * Verifies JWT signature
     */
    private verifyJwt(jwtToken: string): JwtPayload | null {
        try {
            return jwt.verify(jwtToken, this.getJWTSecret()) as JwtPayload;
        } catch {
            return null;
        }
    }

    /**
     * Matches fingerprint fields
     */
    private matchFingerprint(tokenFp: TokenPayload['fp'], reqData: UserDataPayload): boolean {
        const requiredFields: (keyof TokenPayload['fp'])[] = [
            'srvUserAgent', 'forwardedFor', 'realIp', 'platform',
            'timezone', 'srvHost', 'host', 'srvReferer'
        ];

        for (const field of requiredFields) {
            if (tokenFp[field] !== reqData[field as keyof typeof reqData]) return false;
        }

        // Comparación de campos
        if (tokenFp.srvUserAgent !== reqData.srvUserAgent) return false;
        if (tokenFp.forwardedFor !== reqData.forwardedFor) return false;
        if (tokenFp.realIp !== reqData.realIp) return false;
        if (tokenFp.platform !== reqData.platform) return false;
        if (tokenFp.timezone !== reqData.timezone) return false;
        if (tokenFp.srvHost !== reqData.srvHost) return false;
        if (tokenFp.host !== reqData.host) return false;
        if (tokenFp.srvReferer !== reqData.srvReferer) return false;
        if (tokenFp.host !== reqData.srvReferer) return false;

        return true;
    }

    /**
     * Generates JWT token (encrypted if enabled)
     */
    private generateToken(data: object): string {
        // @ts-ignore
        const jwtToken = jwt.sign(data, this.getJWTSecret(), { expiresIn: this.expiresIn });
        return this.isEncryptionEnabled() ? this.crypt.encrypt(jwtToken) : jwtToken;
    }

    private isEncryptionEnabled(): boolean {
        return process.env.TOKEN_ENCRYPTION_ENABLED === 'true';
    }

    private getJWTSecret(): string {
        if (!process.env.JWT_SECRET) throw new UnauthorizedError('JWT_SECRET is not defined');
        return process.env.JWT_SECRET;
    }
}

export default Token;
