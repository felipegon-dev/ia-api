import { Request, Response } from 'express';
import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from "@src/errors/AppError";
import { HEADERS } from "@config/constants/headers";
import UserData, { UserDataPayload } from "@src/services/base/UserData";
import { Crypt } from "@src/services/base/Crypt";
import logger from '@src/util/logger';

// @ts-ignore
import type { TokenPayload } from '@src/services/base/TokenPayload';

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
        if (!expires) throw new AppError('TOKEN_EXPIRATION is not defined', 500, 'INTERNAL_ERROR');
        this.expiresIn = expires;

        const algorithm = process.env.TOKEN_ALGORITHM;
        if (!algorithm) throw new AppError('TOKEN_ALGORITHM is not defined', 500, 'INTERNAL_ERROR');

        const key = process.env.TOKEN_ENCRYPTION_SECRET;
        if (!key) throw new AppError('TOKEN_ENCRYPTION_SECRET is not defined', 500, 'INTERNAL_ERROR');

        this.crypt = new Crypt(algorithm, key);
    }

    /**
     * Validates that the token exists, is valid, and fingerprint matches
     */
    public validate(req: Request): TokenPayload {
        const header = req.headers[HEADERS.TOKEN_API];
        const token = typeof header === 'string' ? header : null;
        if (!token) throw new AppError('Token is missing', 401, 'TOKEN_MISSING');

        let jwtToken: string;
        try {
            jwtToken = this.isEncryptionEnabled() ? this.crypt.decrypt(token) : token;
        } catch (error) {
            const code = (error as NodeJS.ErrnoException)?.code;
            if (
                error instanceof Error &&
                (error.message === 'Invalid encrypted text format' ||
                    ['ERR_CRYPTO_INVALID_IV', 'ERR_CRYPTO_INVALID_AUTH_TAG', 'ERR_OSSL_EVP_BAD_DECRYPT'].includes(code ?? ''))
            ) {
                throw new AppError('Token is invalid', 401, 'TOKEN_INVALID');
            }
            throw new AppError('Token encryption could not be verified', 500, 'INTERNAL_ERROR');
        }
        const decoded = this.verifyJwt(jwtToken);
        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
            throw new AppError('Token is invalid', 401, 'TOKEN_INVALID');
        }

        const tokenPayload = decoded as TokenPayload;
        if (
            !tokenPayload.fp ||
            typeof tokenPayload.fp !== 'object' ||
            Array.isArray(tokenPayload.fp)
        ) {
            throw new AppError('Token is invalid', 401, 'TOKEN_INVALID');
        }
        const currentUserData = this.userData.set(req).get();

        if (!this.matchFingerprint(tokenPayload.fp, currentUserData)) {
            throw new AppError('Fingerprint mismatch', 401, 'TOKEN_FINGERPRINT_MISMATCH');
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
    private verifyJwt(jwtToken: string): JwtPayload {
        const secret = this.getJWTSecret();
        try {
            return jwt.verify(jwtToken, secret) as JwtPayload;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                throw new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
            }
            throw new AppError('Token is invalid', 401, 'TOKEN_INVALID');
        }
    }

    /**
     * Matches fingerprint fields
     * Only validates stable client identity: userAgent, platform, timezone.
     * Excluded fields:
     *   - forwardedFor: proxy chains and client networks can change between requests
     *   - realIp: changes when mobile switches network (WiFi → mobile data)
     *   - srvUserAgent: server-side data, can change on redeploy
     *   - srvHost, srvReferer: server-side data, can change between deployments
     *   - host: server-side data, excluded
     */
    private matchFingerprint(tokenFp: TokenPayload['fp'], reqData: UserDataPayload): boolean {
        const requiredFields: (keyof TokenPayload['fp'])[] = [
            'userAgent', 'platform', 'timezone'
        ];

        for (const field of requiredFields) {
            const tokenValue = tokenFp[field];
            const reqValue = reqData[field as keyof typeof reqData];

            if (tokenValue !== reqValue) {
                logger.error(`Fingerprint mismatch on field "${String(field)}" — tokenFp.${String(field)}: "${String(tokenValue)}" | reqData.${String(field)}: "${String(reqValue)}"`);
                return false;
            }
        }

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
        if (!process.env.JWT_SECRET) {
            throw new AppError('JWT_SECRET is not defined', 500, 'INTERNAL_ERROR');
        }
        return process.env.JWT_SECRET;
    }
}

export default Token;
