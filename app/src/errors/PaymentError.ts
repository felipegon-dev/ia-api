// errors/ValidationError.ts
import { AppError } from './AppError';

export class PaymentError extends AppError {
    public details?: any;

    constructor(message = 'Payment error', details?: any) {
        super(message, 400, 'PAYMENT_ERROR');
        this.details = details;
    }
}
