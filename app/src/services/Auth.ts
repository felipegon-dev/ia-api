import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

export class Auth {
    private expiresIn = '10s'

    getJWTSecret(): string {
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not defined');
        }
        return process.env.JWT_SECRET;
    }
    /**
     * Genera un token JWT firmado
     */
    generateToken(userId: string): string {
        // @ts-ignore
        return jwt.sign({ userId }, this.getJWTSecret(), { expiresIn: this.expiresIn });
    }

    /**
     * Verifica un token JWT
     */
    verifyToken(token: string): string | JwtPayload | null {
        try {
            return jwt.verify(token, this.getJWTSecret());
        } catch (err) {
            return null;
        }
    }

    /**
     * Middleware Express para proteger rutas
     * Primero intenta leer el token del header Authorization
     * Si no está, intenta leerlo desde la sesión
     */
    middleware = (req: Request, res: Response, next: NextFunction) => {
        let token: string | undefined;

        // From header
        const authHeader = req.headers.authorization;
        if (authHeader) {
            token = authHeader.split(' ')[1]; // Bearer <token>
        }

        if (!token) return res.status(401).json({ message: 'No token provided' });

        const decoded = this.verifyToken(token);
        if (!decoded) return res.status(401).json({ message: 'Invalid token' });

        // @ts-ignore
        req.user = decoded;
        next();
    };
}
