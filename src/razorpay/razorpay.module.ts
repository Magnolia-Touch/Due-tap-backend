import { Module } from '@nestjs/common';
import { RazorpayService } from './razorpay.service';
import { RazorpayController } from './razorpay.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayWebhookController } from './razorpay.webhook.controller';

@Module({
    providers: [RazorpayService, PrismaService],
    controllers: [RazorpayController, RazorpayWebhookController],
    exports: [RazorpayService],
})
export class RazorpayModule { }
