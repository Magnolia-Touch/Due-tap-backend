import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from './email.service';
import { SettingsModule } from '../settings/settings.module';
import { TemplateProcessorUtil } from '../common/utils/template-processor.util';
import { NotificationScheduler } from './notification.scheduler';

import { MailerModule } from '@nestjs-modules/mailer'; // ✅
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [ConfigModule, SettingsModule, MailerModule],
  providers: [NotificationsService, WhatsAppService, EmailService, TemplateProcessorUtil, NotificationScheduler],
  exports: [NotificationsService],
  controllers: [NotificationsController]
})
export class NotificationsModule { }
