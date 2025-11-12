import {
    Controller,
    Post,
    Req,
    Headers,
    HttpCode,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { PaymentStatus } from '@prisma/client';

@Controller('stripe/webhook')
export class StripeWebhookController {
    private readonly logger = new Logger(StripeWebhookController.name);
    private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        // apiVersion: '2024-06-20',
    });

    constructor(private prisma: PrismaService) { }

    @Post()
    @HttpCode(200)
    async handleStripeWebhook(
        @Req() req: any,
        @Headers('stripe-signature') signature: string,
    ) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
        let event: Stripe.Event;

        try {
            // Verify event signature
            event = this.stripe.webhooks.constructEvent(
                req.rawBody,
                signature,
                webhookSecret,
            );
        } catch (err: any) {
            this.logger.error(`Invalid webhook signature: ${err.message}`);
            return { received: false };
        }

        this.logger.log(`Received event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'payment_intent.succeeded':
                await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
                break;

            case 'payment_intent.payment_failed':
                await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
                break;

            default:
                this.logger.warn(`Unhandled event type: ${event.type}`);
        }

        return { received: true };
    }

    private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
        const paymentId = session.metadata?.payment_id;
        const paymentIntentId = session.payment_intent as string;
        const sessionId = session.id;

        if (!paymentId) {
            this.logger.warn('Missing payment_id in session metadata.');
            return;
        }

        await this.prisma.payment.updateMany({
            where: { id: paymentId },
            data: {
                status: PaymentStatus.PAID,
                paidDate: new Date(),
                // stripedLinkId: sessionId,
                gatewayPaymentId: paymentIntentId,
                gatewayResponse: session as any,
            },
        });

        this.logger.log(`✅ Payment ${paymentId} marked as PAID (Checkout Session Completed)`);
    }

    private async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
        const paymentId = paymentIntent.metadata?.payment_id;
        if (!paymentId) return;

        await this.prisma.payment.updateMany({
            where: { id: paymentId },
            data: {
                status: PaymentStatus.PAID,
                paidDate: new Date(),
                gatewayPaymentId: paymentIntent.id,
                gatewayResponse: paymentIntent as any,
            },
        });

        this.logger.log(`✅ Payment ${paymentId} marked as PAID (PaymentIntent Succeeded)`);
    }

    private async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
        const paymentId = paymentIntent.metadata?.payment_id;
        if (!paymentId) return;

        await this.prisma.payment.updateMany({
            where: { id: paymentId },
            data: {
                status: 'FAILED',
                gatewayPaymentId: paymentIntent.id,
                gatewayResponse: paymentIntent as any,
            },
        });

        this.logger.warn(`❌ Payment ${paymentId} marked as FAILED`);
    }
}
