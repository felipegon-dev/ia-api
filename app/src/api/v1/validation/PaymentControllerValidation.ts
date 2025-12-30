import { Request } from "express";

export class PaymentControllerValidation {

    public validateRequest(req: Request): void {
        const body = req.body;

        if (!body || typeof body !== 'object') {
            throw new Error('Invalid request body');
        }

        // ===== paymentCode =====
        if (!body.paymentCode || typeof body.paymentCode !== 'string') {
            throw new Error('paymentCode is required and must be a string');
        }

        // ===== cartItems =====
        if (!Array.isArray(body.cartItems) || body.cartItems.length === 0) {
            throw new Error('cartItems must be a non-empty array');
        }

        // ===== addressItems =====
        if (!Array.isArray(body.addressItems) || body.addressItems.length === 0) {
            throw new Error('addressItems must be a non-empty array');
        }

        // ===== shippingMethods =====
        if (!Array.isArray(body.shippingMethods)) {
            throw new Error('shippingMethods must be an array');
        }

        // ===== description (optional) =====
        if (
            body.description !== undefined &&
            body.description !== null &&
            typeof body.description !== 'string'
        ) {
            throw new Error('description must be a string');
        }
    }
}
