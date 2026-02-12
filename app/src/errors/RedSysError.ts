// errors/ValidationError.ts
import { AppError } from './AppError';

export class RedSysError extends AppError {
    public details?: any;

    constructor(message = 'RedSys error', details?: any) {
        super(message, 400, 'REDSYS_VALIDATION_ERROR');
        this.details = details;
    }
}
