import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { CommonModule } from 'src/common/common.module';
import { firebaseAdminProvider } from './providers/firebase.provider';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [CommonModule, HttpModule],
  controllers: [NotificationsController],
  providers: [firebaseAdminProvider, NotificationsService],
})
export class NotificationsModule {}
