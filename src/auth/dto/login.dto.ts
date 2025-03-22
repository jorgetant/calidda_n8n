import { IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  plate: string;
}

export class LogUserAccessDto {
  @IsString()
  @IsOptional()
  deviceInfo?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsDate()
  @IsOptional()
  timestamp?: Date;
}
