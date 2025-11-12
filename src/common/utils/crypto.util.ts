import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const KEY = Buffer.from(process.env.ENCRYPTION_MASTER_KEY!, 'base64'); // 32 bytes

// if (KEY.length !== 32) throw new Error('ENCRYPTION_MASTER_KEY must be 32 bytes (base64)');

export function encrypt(plain: string) {
    // const iv = randomBytes(12);
    // const cipher = createCipheriv('aes-256-gcm', KEY, iv);
    // const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    // const tag = cipher.getAuthTag();
    // return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(enc: string) {
    // const data = Buffer.from(enc, 'base64');
    // const iv = data.slice(0, 12);
    // const tag = data.slice(12, 28);
    // const ciphertext = data.slice(28);
    // const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
    // decipher.setAuthTag(tag);
    // const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    // return decrypted.toString('utf8');
}
