
// todo : use cart entity
export class PaymentManager {
    public validatePayment(
        userId: string,
        paymentCode: string,
        amount: number,
        items: any[],
    ) : this {
        return this;
    }

    public getPaymentUrl(): string {
        return 'https://payment-gateway.test/pay';
    }

    private validatePaymentCode(userId: string, paymentCode: string): boolean {
        return true;
    }

    private getPaymentMethod(): any
    { // paypal, stripe, etc
        return {};
    }

    private getPaymentToken(userId: string): string {
        return 'test-token';
    }
}