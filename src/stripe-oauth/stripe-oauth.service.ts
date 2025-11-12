import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as dayjs from 'dayjs';

@Injectable()
export class StripeOAuthService {
    private clientId = process.env.STRIPE_CLIENT_ID;
    private clientSecret = process.env.STRIPE_CLIENT_SECRET;
    private redirectUri = process.env.STRIPE_REDIRECT_URI;

    constructor(private readonly prisma: PrismaService) { }

    generateConnectUrl(clientId: string): string {
        const state = encodeURIComponent(clientId);
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.clientId,
            scope: 'read_write',
            redirect_uri: this.redirectUri,
            state,
        });
        return `${process.env.STRIPE_API_BASE}/oauth/authorize?${params.toString()}`;
    }

    async handleCallback(code: string, state: string) {
        try {
            const tokenUrl = 'https://connect.stripe.com/oauth/token';

            const response = await axios.post(tokenUrl, new URLSearchParams({
                grant_type: 'authorization_code',
                client_secret: this.clientSecret,
                code,
            }));

            const data = response.data;
            const clientId = decodeURIComponent(state);

            await this.prisma.stripeConnection.upsert({
                where: { clientId },
                update: {
                    accountId: data.stripe_user_id,
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    scope: data.scope,
                    livemode: data.livemode,
                    expiresAt: dayjs().add(90, 'days').toDate(), // Stripe tokens usually long-lived
                },
                create: {
                    clientId,
                    accountId: data.stripe_user_id,
                    accessToken: data.access_token,
                    refreshToken: data.refresh_token,
                    scope: data.scope,
                    livemode: data.livemode,
                    expiresAt: dayjs().add(90, 'days').toDate(),
                },
            });
        } catch (error) {
            console.error('Stripe OAuth Error:', error.response?.data || error);
            throw new HttpException('OAuth token exchange failed', HttpStatus.BAD_REQUEST);
        }
    }
}
