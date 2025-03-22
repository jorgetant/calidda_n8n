import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateStationDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  osinergmin_code: string;

  @IsNotEmpty()
  @IsString()
  province?: string;

  @IsNotEmpty()
  @IsString()
  district?: string;

  @IsNotEmpty()
  @IsString()
  client_type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @IsNotEmpty()
  @IsNumber()
  longitude: number;

  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNotEmpty()
  @IsString()
  station_type: string;

  @IsNotEmpty()
  @IsNumber()
  islands: number;

  @IsNotEmpty()
  @IsNumber()
  mangueras: number;
}

export class CreateVisitStationDto {
  @IsNotEmpty()
  @IsString()
  stationId: string;

  @IsDate()
  @IsOptional()
  timestamp?: Date;
}

enum ReviewComment {
  GOOD_PRICE = 'Buen precio',
  SATURATION = 'Saturación',
  DISTANCE = 'Distancia',
}

export class CreateReviewDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(5)
  score: number;

  @IsNotEmpty()
  @IsString()
  stationId: string;

  @IsNotEmpty()
  @IsEnum(ReviewComment)
  comment: ReviewComment;
}
