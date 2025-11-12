import { Controller, Post, Req, Headers, HttpCode, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { verifyRazorpaySignature } from 'src/common/utils/razorpay-signature.util';
import { PaymentStatus } from '@prisma/client';

@Controller('razorpay/webhook')
export class RazorpayWebhookController {
    private readonly logger = new Logger(RazorpayWebhookController.name);

    constructor(private prisma: PrismaService) { }

    @Post()
    @HttpCode(200)
    async handleWebhook(
        @Req() req: any,
        @Headers('x-razorpay-signature') signature: string,
    ) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;
        const body = req.body;

        // ✅ Verify webhook signature
        const valid = verifyRazorpaySignature(body, signature, secret);
        if (!valid) {
            this.logger.warn('Invalid Razorpay webhook signature');
            return { received: false };
        }

        const event = body.event;
        this.logger.log(`Received Razorpay webhook: ${event}`);

        if (event === 'payment_link.paid') {
            const entity = body.payload.payment_link.entity;
            const razorpayLinkId = entity.id;
            const amount = entity.amount / 100;

            await this.prisma.payment.updateMany({
                // where: { razorpayLinkId },
                data: { status: PaymentStatus.PAID },
            });

            this.logger.log(`Payment ${razorpayLinkId} marked as PAID (${amount} INR)`);
        }

        if (event === 'payment_link.cancelled') {
            const entity = body.payload.payment_link.entity;
            const razorpayLinkId = entity.id;

            await this.prisma.payment.updateMany({
                // where: { razorpayLinkId },
                data: { status: PaymentStatus.CANCELLED },
            });

            this.logger.log(`Payment ${razorpayLinkId} cancelled`);
        }

        return { received: true };
    }
}
