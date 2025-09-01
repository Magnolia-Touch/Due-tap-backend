import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { WhatsAppService } from './whatsapp.service';
import { EmailService } from './email.service';
import { SettingsModule } from '../settings/settings.module';
import { TemplateProcessorUtil } from '../common/utils/template-processor.util';

@Module({
  imports: [ConfigModule, SettingsModule],
  providers: [NotificationsService, WhatsAppService, EmailService, TemplateProcessorUtil],
  exports: [NotificationsService]
})
export class NotificationsModule {}
