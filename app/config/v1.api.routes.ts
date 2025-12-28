import { UserController } from '@src/api/v1/controllers/UserController';
import { SpaTokenController } from '@src/api/v1/controllers/SpaTokenController';
import { Container } from '@config/Container';
import Token from "@src/services/base/Token";
import UserDomainValidation from "@src/services/user/UserDomainValidation";
import {PaymentController} from "@src/api/v1/controllers/PaymentController";
import {CartManager} from "@src/services/cart/CartManager";
import {PaymentFactory} from "@src/services/payment/PaymentFactory";
import {SHARED_URLS} from "@config/constants/sharedUrls";
import {AddressManager} from "@src/services/user/AddressManager";
import {PaymentManager} from "@src/services/payment/PaymentManager";

export const container = new Container();

export interface RouteConfig {
    controller: any;          // Clase del controlador
    method: string;           // Método del controlador
    path: string;             // Path de la ruta
    httpMethod?: 'get' | 'post' | 'put' | 'patch' | 'delete'; // Default: get
    requires?: any[];         // Dependencias / middlewares
}

export const v1ApiRoutes: RouteConfig[] = [
    {
        controller: UserController,
        method: 'getUserById',
        path: '/api/v1/user/:id',
        requires: [Token, UserDomainValidation]
    },
    {
        controller: SpaTokenController,
        method: 'getToken',
        path: '/api/v1/token',
        requires: [Token, UserDomainValidation],
    },
    {
        controller: PaymentController,
        method: 'postPayment',
        path: '/api/v1/payment',
        requires: [Token, UserDomainValidation, CartManager, PaymentFactory, AddressManager, PaymentManager],
        httpMethod: 'post'
    },
    {
        controller: PaymentController,
        method: 'callbackPayment',
        path: '/api/v1/payment/sync',
        requires: [Token, UserDomainValidation, CartManager, PaymentFactory, AddressManager, PaymentManager],
        httpMethod: 'post'
    }
];