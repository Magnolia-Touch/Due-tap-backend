import * as crypto from 'crypto';

export function verifyRazorpaySignature(body: any, signature: string, secret: string): boolean {
    const payload = JSON.stringify(body);
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return expectedSignature === signature;
}
