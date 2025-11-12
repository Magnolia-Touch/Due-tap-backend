import { Controller, Get, Post, Body, Req, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RazorpayService } from './razorpay.service';

class OAuthCallbackDto {
    code: string;
    state: string; // clientId
}

class PaymentLinkDto {
    amount: number; // rupees
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    currency?: string;
    extra?: any;
}

@Controller('razorpay')
export class RazorpayController {
    // constructor(private readonly razorpayService: RazorpayService) { }

    // @UseGuards(JwtAuthGuard)
    // @Get('connect-url')
    // getConnectUrl(@Req() req) {
    //     const clientId = req.user.client.id;
    //     const url = this.razorpayService.getConnectUrl(clientId);
    //     return { url };
    // }

    // // Accept from frontend: { code, state }
    // @Post('oauth/callback')
    // @HttpCode(200)
    // async oauthCallback(@Body() body: OAuthCallbackDto) {
    //     const { code, state } = body;
    //     if (!code || !state) return { ok: false, message: 'Missing code or state' };
    //     await this.razorpayService.exchangeCodeAndSave(code, state);
    //     return { ok: true };
    // }

    // @UseGuards(JwtAuthGuard)
    // @Get('status')
    // async status(@Req() req) {
    //     const clientId = req.user.client.id;
    //     return await this.razorpayService.getStatus(clientId);
    // }

    // @UseGuards(JwtAuthGuard)
    // @Post('payment-link')
    // async createPaymentLink(@Req() req, @Body() body: PaymentLinkDto) {
    //     const clientId = req.user.client.id;
    //     const link = await this.razorpayService.createPaymentLink(clientId, body);
    //     // optional: store in Payment/Task table here
    //     return link;
    // }
}
