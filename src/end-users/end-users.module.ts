import { Module } from '@nestjs/common';
import { EndUsersController } from './end-users.controller';
import { EndUsersService } from './end-users.service';
import { ClientsModule } from 'src/clients/clients.module';

@Module({
  imports: [ClientsModule],
  controllers: [EndUsersController],
  providers: [EndUsersService],
})
export class EndUsersModule {}
