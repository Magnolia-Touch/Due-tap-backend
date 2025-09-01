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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env${process.env.NODE_ENV === 'test' ? '.test' : ''}`,
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
  ],
})
export class AppModule {}
