// errors/ValidationError.ts
import { AppError } from './AppError';

export class WorkerError extends AppError {
    public details?: any;

    constructor(message = 'Worker error', details?: any) {
        super(message, 400, 'WORKER_ERROR');
        this.details = details;
    }
}
