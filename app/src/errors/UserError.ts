// errors/NotFoundError.ts
import { AppError } from './AppError';

export class UserError extends AppError {
    constructor(message = 'User not found') {
        super(message, 404, 'NOT_FOUND');
    }
}
