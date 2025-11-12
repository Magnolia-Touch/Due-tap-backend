import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from 'src/common/utils/crypto.util';

@Injectable()
export class RazorpayService {
    // private readonly logger = new Logger(RazorpayService.name);
    // private readonly clientId = process.env.RAZORPAY_PARTNER_CLIENT_ID!;
    // private readonly clientSecret = process.env.RAZORPAY_PARTNER_CLIENT_SECRET!;
    // private readonly redirectUri = process.env.RAZORPAY_REDIRECT_URI!;

    // constructor(private prisma: PrismaService) { }

    // getConnectUrl(clientIdForState: string) {
    //     const state = encodeURIComponent(clientIdForState);
    //     const url = `https://auth.razorpay.com/authorize?response_type=code&client_id=${this.clientId}` +
    //         `&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=read_write&state=${state}`;
    //     return url;
    // }

    // async exchangeCodeAndSave(code: string, stateClientId: string) {
    //     const params = new URLSearchParams({
    //         grant_type: 'authorization_code',
    //         code,
    //         client_id: this.clientId,
    //         client_secret: this.clientSecret,
    //         redirect_uri: this.redirectUri,
    //     }).toString();

    //     const resp = await axios.post('https://auth.razorpay.com/token', params, {
    //         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //     });

    //     const { access_token, refresh_token, merchant_id, expires_in } = resp.data;
    //     const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    //     await this.prisma.razorpayConnection.upsert({
    //         where: { clientId: stateClientId },
    //         update: {
    //             merchantId: merchant_id,
    //             accessToken: encrypt(access_token),
    //             refreshToken: encrypt(refresh_token),
    //             expiresAt,
    //             revoked: false,
    //         },
    //         create: {
    //             clientId: stateClientId,
    //             merchantId: merchant_id,
    //             accessToken: encrypt(access_token),
    //             refreshToken: encrypt(refresh_token),
    //             expiresAt,
    //         },
    //     });

    //     return { merchantId: merchant_id };
    // }

    // private async refreshTokenIfNeeded(conn: any) {
    //     if (!conn) throw new Error('No connection');
    //     if (conn.revoked) throw new Error('revoked');

    //     const now = new Date();
    //     if (conn.expiresAt && now < conn.expiresAt) {
    //         return decrypt(conn.accessToken);
    //     }

    //     // expired -> refresh
    //     const refreshToken = decrypt(conn.refreshToken);
    //     const params = new URLSearchParams({
    //         grant_type: 'refresh_token',
    //         refresh_token: refreshToken,
    //         client_id: this.clientId,
    //         client_secret: this.clientSecret,
    //     }).toString();

    //     const resp = await axios.post('https://auth.razorpay.com/token', params, {
    //         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //     });

    //     const { access_token, refresh_token, expires_in } = resp.data;
    //     const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000);

    //     await this.prisma.razorpayConnection.update({
    //         where: { clientId: conn.clientId },
    //         data: {
    //             accessToken: encrypt(access_token),
    //             refreshToken: encrypt(refresh_token),
    //             expiresAt,
    //             revoked: false,
    //         },
    //     });

    //     return access_token;
    // }

    // async getValidAccessTokenForClient(clientId: string) {
    //     const conn = await this.prisma.razorpayConnection.findUnique({ where: { clientId } });
    //     if (!conn) throw new Error('No razorpay connection');
    //     const token = await this.refreshTokenIfNeeded(conn);
    //     return token;
    // }

    // async createPaymentLink(clientId: string, payload: any) {
    //     const token = await this.getValidAccessTokenForClient(clientId);
    //     if (!token) throw new Error('Unable to obtain access token');

    //     const body = {
    //         amount: Math.round(Number(payload.amount) * 100),
    //         currency: payload.currency || 'INR',
    //         customer: {
    //             name: payload.customerName,
    //             email: payload.customerEmail,
    //             contact: payload.customerPhone,
    //         },
    //         notify: { sms: !!payload.customerPhone, email: !!payload.customerEmail },
    //         ...payload.extra, // optional extension
    //     };

    //     const res = await axios.post('https://api.razorpay.com/v1/payment_links', body, {
    //         headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    //     });

    //     return res.data;
    // }

    // async getStatus(clientId: string) {
    //     const conn = await this.prisma.razorpayConnection.findUnique({ where: { clientId } });
    //     if (!conn) return { connected: false };
    //     return {
    //         connected: !conn.revoked,
    //         merchantId: conn.merchantId,
    //         expiresAt: conn.expiresAt,
    //     };
    // }

    // // Optionally mark revoked (used by webhook)
    // async markRevoked(clientId: string) {
    //     await this.prisma.razorpayConnection.update({
    //         where: { clientId },
    //         data: { revoked: true },
    //     });
    // }
}
