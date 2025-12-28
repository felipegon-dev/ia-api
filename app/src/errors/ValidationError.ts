// errors/ValidationError.ts
import { AppError } from './AppError';

export class ValidationError extends AppError {
    public details?: any;

    constructor(message = 'Validation error', details?: any) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}
