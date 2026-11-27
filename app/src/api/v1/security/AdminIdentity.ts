import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '@src/errors/UnauthorizedError';
import { ForbiddenError } from '@src/errors/ForbiddenError';

export const ADMIN_IDENTITY_MAX_SKEW_SECONDS = 300;
export const ADMIN_API_PREFIX = '/api/v1/admin';

const HEADER_EMAIL = 'x-ia-admin-email';
const HEADER_TIMESTAMP = 'x-ia-admin-timestamp';
const HEADER_SIGNATURE = 'x-ia-admin-signature';

/** HMAC-SHA256 hex of `timestamp\nemail\nMETHOD\npathname` (shared with Laravel). */
export function signAdminIdentity(secret: string, timestamp: string, email: string, method: string, pathname: string): string {
    return crypto.createHmac('sha256', secret)
        .update(`${timestamp}\n${email}\n${method.toUpperCase()}\n${pathname}`, 'utf8')
        .digest('hex');
}

function header(req: Request, name: string): string {
    const value = req.headers[name];
    if (typeof value !== 'string' || !/^[\x21-\x7e]{1,320}$/.test(value)) {
        throw new UnauthorizedError('Missing or invalid admin identity');
    }
    return value;
}

function assertSameEmail(value: unknown, signedEmail: string): void {
    if (value === undefined) return;
    if (typeof value !== 'string' || value.trim() !== signedEmail) {
        throw new ForbiddenError('Email does not match the authenticated admin identity');
    }
}

/**
 * Verifies the signed admin identity sent by ia-website and returns the email.
 * Any `email` in query or body must equal the signed one.
 */
export function verifyAdminIdentity(req: Request, secret: string | undefined, now = Math.floor(Date.now() / 1000)): string {
    if (!secret || secret.length < 32) {
        throw new Error('IA_ADMIN_SHARED_SECRET is not configured (at least 32 characters)');
    }
    const email = header(req, HEADER_EMAIL);
    const timestamp = header(req, HEADER_TIMESTAMP);
    const signature = header(req, HEADER_SIGNATURE);

    if (!/^\d{1,12}$/.test(timestamp) || Math.abs(now - Number(timestamp)) > ADMIN_IDENTITY_MAX_SKEW_SECONDS) {
        throw new UnauthorizedError('Admin identity expired');
    }
    if (!/^[a-f0-9]{64}$/.test(signature)) {
        throw new UnauthorizedError('Invalid admin identity signature');
    }

    const pathname = (req.originalUrl ?? req.url).split('?')[0];
    const expected = Buffer.from(signAdminIdentity(secret, timestamp, email, req.method, pathname), 'hex');
    if (!crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'))) {
        throw new UnauthorizedError('Invalid admin identity signature');
    }

    assertSameEmail(req.query?.email, email);
    if (req.body && typeof req.body === 'object') {
        assertSameEmail((req.body as Record<string, unknown>).email, email);
    }
    return email;
}

/** Express middleware protecting every /api/v1/admin route. */
export function adminIdentityMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
        res.locals.adminEmail = verifyAdminIdentity(req, process.env.IA_ADMIN_SHARED_SECRET);
        next();
    } catch (err) {
        next(err);
    }
}
