import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { StripeOAuthService } from './stripe-oauth.service';
import { Response } from 'express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('stripe/oauth')
export class StripeOAuthController {
    constructor(private readonly stripeOAuthService: StripeOAuthService) { }

    // 1. Redirect URL generation
    @UseGuards(JwtAuthGuard)
    @Get('connect-url')
    async getConnectUrl(@Req() req, @Res() res: Response) {
        const url = this.stripeOAuthService.generateConnectUrl(req.user.clientId);
        return res.json({ url });
    }

    // 2. OAuth callback
    @Get('callback')
    async handleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
        await this.stripeOAuthService.handleCallback(code, state);
        return res.send('Stripe account connected successfully!');
    }
}
