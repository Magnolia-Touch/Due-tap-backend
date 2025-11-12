import { Module } from '@nestjs/common';
import { StripeOAuthController } from './stripe-oauth.controller';
import { StripeOAuthService } from './stripe-oauth.service';
import { StripeWebhookController } from './stripe.webhook.controller';

@Module({
  controllers: [StripeOAuthController, StripeWebhookController],
  providers: [StripeOAuthService]
})
export class StripeOauthModule { }
