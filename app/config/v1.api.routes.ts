import { UserController } from '@application/api/v1/controllers/UserController';
import { SpaTokenController } from '@application/api/v1/controllers/SpaTokenController';
import { Container } from '@config/Container';
import {UserService} from "@application/services/UserService";
import Token from "@application/services/base/Token";
import UserValidation from "@application/services/user/UserValidation";

const container = new Container();

export interface RouteConfig {
    controller: any;          // Clase del controlador
    method: string;           // Método del controlador
    path: string;             // Path de la ruta
    httpMethod?: 'get' | 'post' | 'put' | 'patch' | 'delete'; // Default: get
    requires?: any[];         // Dependencias / middlewares
}

const v1ApiRoutes: RouteConfig[] = [
    {
        controller: UserController,
        method: 'getUserById',
        path: '/api/v1/user/:id',
        requires: [UserService, Token]
    },
    {
        controller: SpaTokenController,
        method: 'getToken',
        path: '/api/v1/token',
        requires: [Token, UserValidation],
    }
];

export default v1ApiRoutes;
export { container };
