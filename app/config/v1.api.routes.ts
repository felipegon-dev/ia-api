import { UserController } from '@src/api/v1/controllers/UserController';
import { SpaTokenController } from '@src/api/v1/controllers/SpaTokenController';
import { Container } from '@config/Container';
import Token from "@src/services/base/Token";
import UserDomainValidation from "@src/services/user/UserDomainValidation";
import {PaymentController} from "@src/api/v1/controllers/PaymentController";
import {PaymentControllerInjection} from "@src/api/v1/injection/PaymentControllerInjection";
import { UserPaymentMethodController } from "@src/api/v1/controllers/UserPaymentMethodController";
import { UserPaymentMethodFactory } from "@src/services/payment/userPaymentMethod/UserPaymentMethodFactory";
import UserPaymentOrdersRepository from "@config/database/repository/UserPaymentOrdersRepository";
import { SecurityController } from "@src/api/v1/controllers/SecurityController";

export const container = new Container();

export interface RouteConfig {
    controller: any;          // Clase del controlador
    method: string;           // Método del controlador
    path: string;             // Path de la ruta
    httpMethod?: 'get' | 'post' | 'put' | 'patch' | 'delete'; // Default: get
    requires?: any[];         // Dependencias / middlewares
}

export const CALL_BACK_PATH = '/api/v1/payment/callback';
export const CALL_BACK_BASE_URL_DEV = 'https://ungraved-intercoracoid-christoper.ngrok-free.dev';

export const v1ApiRoutes: RouteConfig[] = [
    {
        controller: UserController,
        method: 'getUserById',
        path: '/api/v1/user/:id',
        requires: [Token, UserDomainValidation]
    },
    {
        controller: UserController,
        method: 'getUserPaymentMethod',
        path: '/api/v1/user/payment-method/:type',
        requires: [Token, UserDomainValidation, UserPaymentMethodFactory, UserPaymentOrdersRepository],
        httpMethod: 'get'
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
        requires: [PaymentControllerInjection],
        httpMethod: 'post'
    },
    {
        controller: PaymentController,
        method: 'callbackPayment',
        path: CALL_BACK_PATH,
        requires: [PaymentControllerInjection],
        httpMethod: 'post'
    },
    {
        controller: PaymentController,
        method: 'validateCallbackPayment',
        path: '/api/v1/payment/callback/validate',
        requires: [PaymentControllerInjection],
        httpMethod: 'post'
    },
    // ── Admin: payment methods ────────────────────────────────────────────
    {
        controller: UserPaymentMethodController,
        method: 'getPaymentMethods',
        path: '/api/v1/admin/payment-methods',
        requires: [UserPaymentMethodFactory],
        httpMethod: 'get'
    },
    {
        controller: UserPaymentMethodController,
        method: 'getCredentials',
        path: '/api/v1/admin/payment-methods/:method',
        requires: [UserPaymentMethodFactory],
        httpMethod: 'get'
    },
    {
        controller: UserPaymentMethodController,
        method: 'saveCredentials',
        path: '/api/v1/admin/payment-methods/:method',
        requires: [UserPaymentMethodFactory],
        httpMethod: 'post'
    },
    // ── Security ─────────────────────────────────────────────────────────
    {
        controller: SecurityController,
        method: 'logTampering',
        path: '/api/v1/security/log',
        requires: [],
        httpMethod: 'post'
    },
];