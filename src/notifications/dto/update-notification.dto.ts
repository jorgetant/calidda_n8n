import { PartialType } from '@nestjs/mapped-types';
import { NotificationDto } from './create-notification.dto';

export class UpdateNotificationDto extends PartialType(NotificationDto) {}
