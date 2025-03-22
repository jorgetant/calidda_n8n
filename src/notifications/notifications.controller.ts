import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationDto } from './dto/create-notification.dto';
import { ApiKeyGuard } from 'src/auth/guards/api-key.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(ApiKeyGuard)
  @Post()
  notify(@Body() notificationDto: NotificationDto) {
    return this.notificationsService.sendNotify(notificationDto);
  }

  // @Get()
  // notifyList() {
  //   return this.notificationsService.handelCronNotification();
  // }
}
