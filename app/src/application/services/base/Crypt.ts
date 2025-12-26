import crypto from 'crypto';

export class Crypt {
    private algorithm: string;
    private key: Buffer;

    constructor(algorithm: string, key: string) {
        this.algorithm = algorithm;
        this.key = Buffer.from(key, 'utf8');
    }

    /**
     * Encrypt a plaintext string and return iv.authTag.ciphertext base64 encoded
     */
    public encrypt(plainText: string): string {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(plainText, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        // @ts-ignore
        const authTag = cipher.getAuthTag().toString('base64');

        return `${iv.toString('base64')}.${authTag}.${encrypted}`;
    }

    /**
     * Decrypt a string encrypted by this class
     */
    public decrypt(encryptedText: string): string {
        const [ivB64, authTagB64, encrypted] = encryptedText.split('.');
        if (!ivB64 || !authTagB64 || !encrypted) {
            throw new Error('Invalid encrypted text format');
        }

        const decipher = crypto.createDecipheriv(this.algorithm, this.key, Buffer.from(ivB64, 'base64'));
        // @ts-ignore
        decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));

        const decrypted = decipher.update(encrypted, 'base64', 'utf8') + decipher.final('utf8');
        return decrypted;
    }
}
