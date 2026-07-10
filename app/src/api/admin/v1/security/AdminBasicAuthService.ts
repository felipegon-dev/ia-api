import { Request } from 'express';
import { UnauthorizedError } from '@src/errors/UnauthorizedError';
import bcrypt from 'bcryptjs';

export class AdminBasicAuthService {
    validate(req: Request): void {
        const htpasswdEntry = process.env.ADMIN_BASIC_AUTH_HTPASSWD;

        if (!htpasswdEntry) {
            throw new Error('Missing ADMIN_BASIC_AUTH_HTPASSWD in env');
        }

        const authorization = req.headers.authorization;
        if (!authorization || !authorization.startsWith('Basic ')) {
            throw new UnauthorizedError('Missing basic authorization');
        }

        const encodedCredentials = authorization.slice(6).trim();
        const decoded = Buffer.from(encodedCredentials, 'base64').toString('utf8');
        const separatorIndex = decoded.indexOf(':');

        if (separatorIndex === -1) {
            throw new UnauthorizedError('Invalid basic authorization format');
        }

        const expectedSeparatorIndex = htpasswdEntry.indexOf(':');
        if (expectedSeparatorIndex === -1) {
            throw new Error('Invalid ADMIN_BASIC_AUTH_HTPASSWD format. Expected user:hash');
        }

        const expectedUser = htpasswdEntry.slice(0, expectedSeparatorIndex);
        const expectedHashRaw = htpasswdEntry.slice(expectedSeparatorIndex + 1);
        const expectedHash = expectedHashRaw.startsWith('$2y$')
            ? `$2a$${expectedHashRaw.slice(4)}`
            : expectedHashRaw;

        const user = decoded.slice(0, separatorIndex);
        const password = decoded.slice(separatorIndex + 1);

        if (user !== expectedUser || !bcrypt.compareSync(password, expectedHash)) {
            throw new UnauthorizedError('Invalid credentials');
        }
    }
}
