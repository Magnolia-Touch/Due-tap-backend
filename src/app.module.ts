// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResponseModule } from './response/response.module';
import { ScheduleModule } from '@nestjs/schedule';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { ClientsModule } from './clients/clients.module';
import { TemplatesModule } from './templates/templates.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { PaymentsModule } from './payments/payments.module';
import { EndUsersModule } from './end-users/end-users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PugAdapter } from '@nestjs-modules/mailer/dist/adapters/pug.adapter';
import { join } from 'path';
import { MailerModule } from '@nestjs-modules/mailer';
import { RazorpayModule } from './razorpay/razorpay.module';
import { StripeOauthModule } from './stripe-oauth/stripe-oauth.module';
import { TasksModule } from './common/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`,
    }),
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',       // your SMTP host
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      defaults: {
        from: '"No Reply" <no-duetap@gmail.com>',
      },
      template: {
        dir: join(process.cwd(), 'src/mailer-templates'), // ✅ absolute path
        adapter: new PugAdapter(),
        options: {
          strict: true,
        },
      }
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ResponseModule,
    ScheduleModule.forRoot(),
    SuperAdminModule,
    ClientsModule,
    TemplatesModule,
    SubscriptionsModule,
    AnalyticsModule,
    SettingsModule,
    PaymentsModule,
    EndUsersModule,
    NotificationsModule,
    TasksModule
    // RazorpayModule,
    // StripeOauthModule
  ],
})
export class AppModule { }
