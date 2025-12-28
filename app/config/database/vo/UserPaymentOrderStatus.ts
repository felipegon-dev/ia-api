// UserPaymentOrderStatus.ts
export class UserPaymentOrderStatus {
    private constructor(
        private readonly value: 'pending' | 'completed' | 'failed' | 'cancelled'
    ) {}

    static PENDING = new UserPaymentOrderStatus('pending');
    static COMPLETED = new UserPaymentOrderStatus('completed');
    static FAILED = new UserPaymentOrderStatus('failed');
    static CANCELLED = new UserPaymentOrderStatus('cancelled');

    get Value() {
        return this.value;
    }

    equals(other: UserPaymentOrderStatus) {
        return this.value === other.value;
    }

    /**
     * Útil para validaciones desde string (webhooks, providers, etc.)
     */
    static fromString(value: string): UserPaymentOrderStatus {
        switch (value) {
            case 'pending':
                return UserPaymentOrderStatus.PENDING;
            case 'completed':
                return UserPaymentOrderStatus.COMPLETED;
            case 'failed':
                return UserPaymentOrderStatus.FAILED;
            case 'cancelled':
                return UserPaymentOrderStatus.CANCELLED;
            default:
                throw new Error(`Invalid UserPaymentOrderStatus: ${value}`);
        }
    }

    /**
     * Para Sequelize ENUM
     */
    static values(): Array<'pending' | 'completed' | 'failed' | 'cancelled'> {
        return ['pending', 'completed', 'failed', 'cancelled'];
    }
}
