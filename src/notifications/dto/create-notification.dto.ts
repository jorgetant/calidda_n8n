import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class NotificationDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsArray()
  topics?: string[];

  @IsOptional()
  @IsString()
  urlImage?: string;

  @IsOptional()
  @IsString()
  deviceToken?: string;

  @IsOptional()
  @IsArray()
  deviceTokens?: string[];
}
