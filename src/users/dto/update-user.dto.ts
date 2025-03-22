import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { Exclude } from 'class-transformer';

export class UpdateUserDto {
  @IsNotEmpty()
  @IsBoolean()
  acceptNotification: boolean;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsBoolean()
  activo: boolean;

  @Exclude()
  plate: string;

  @Exclude()
  vehicleType: number;
}
