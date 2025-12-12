import { Request, Response } from 'express';
import { UserService } from '@services/UserService';
import { Auth } from '@services/Auth';
import jwt from 'jsonwebtoken';

const TOKEN_SECRET = process.env.TOKEN_SECRET || "supersecret"; // secreto para firmar tokens
const TOKEN_EXPIRATION = 60; // 60 segundos por ejemplo

export class UserController {
    constructor(private userService = new UserService()) {}

    // GET /user/:id
    getUserById = async (req: Request, res: Response) => {
        try {
            // Obtener token del header o cookie
            const token = req.headers['x-app-token-api'] as string || null;
            if (!token) {
                return res.status(401).json({ success: false, message: "No token provided" });
            }

            // Validar token
            const auth = new Auth();
            const isValid = auth.verifyToken(token);
            if (!isValid) {
                return res.status(401).json({ success: false, message: "Invalid token" });
            }

            // Obtener usuario
            const userId = req.params.id;
            const user = await this.userService.getUserById(userId);
            res.status(200).json({ success: true, data: user });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };

    // GET /token
    getToken = (req: Request, res: Response) => {
        try {
            // Crear un token JWT simple
            const payload = { issuedAt: Date.now() };
            const token = jwt.sign(payload, TOKEN_SECRET, { expiresIn: TOKEN_EXPIRATION });

            // Devolver token como JSON
            res.status(200).json({ success: true, data: token });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    };
}
