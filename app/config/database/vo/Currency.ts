// src/domain/valueObjects/Currency.ts
export class Currency {
    private readonly code: string;

    // Lista de códigos ISO 4217 más usados
    private static readonly VALID_CODES = [
        'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD', 'CNY', 'SEK',
        'NOK', 'MXN', 'SGD', 'HKD', 'KRW', 'BRL', 'ZAR', 'INR', 'RUB', 'TRY',
        'PLN', 'DKK', 'MYR', 'THB', 'IDR', 'CZK', 'HUF'
    ];

    private constructor(code: string) {
        const upper = code.toUpperCase();
        if (!Currency.VALID_CODES.includes(upper)) {
            throw new Error(`Invalid currency code: ${code}`);
        }
        this.code = upper;
    }

    /** Genérico */
    public static of(code: string): Currency {
        return new Currency(code);
    }

    /** Devuelve el valor */
    get value(): string {
        return this.code;
    }

    toString(): string {
        return this.code;
    }

    /** Método para generar dinámicamente los static shortcuts */
    private static _initShortcuts() {
        Currency.VALID_CODES.forEach(code => {
            // @ts-ignore
            Currency[code] = () => new Currency(code);
        });
    }
}

// Inicializamos los métodos estáticos
Currency['_initShortcuts']();
