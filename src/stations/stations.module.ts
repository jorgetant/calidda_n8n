import { Module } from '@nestjs/common';
import { StationsService } from './stations.service';
import { StationsController } from './stations.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { Station } from './entities/station.entity';
import { SessionsModule } from 'src/sessions/sessions.module';
import { VisitStation } from './entities/visitStation.entity';
import { HttpModule } from '@nestjs/axios';
import { PopularTimes } from './entities/popular_times.entity';
import { Saturation } from './entities/saturation.entity';
import { Prices } from './entities/prices.entity';
@Module({
  imports: [
    SequelizeModule.forFeature([
      Station,
      VisitStation,
      PopularTimes,
      Saturation,
      Prices,
    ]),
    SessionsModule,
    HttpModule,
  ],
  controllers: [StationsController],
  providers: [StationsService],
  exports: [StationsService],
})
export class StationsModule {}
