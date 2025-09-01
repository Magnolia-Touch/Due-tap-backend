import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { EncryptionUtil } from '../common/utils/encryption.util';
import { ClientsModule } from 'src/clients/clients.module';

@Module({
  imports: [ClientsModule],
  controllers: [SettingsController],
  providers: [SettingsService, EncryptionUtil],
  exports: [SettingsService],
})
export class SettingsModule {}
