import { Module } from '@nestjs/common';
import { FtpService } from './ftp.service';
import { StationsModule } from 'src/stations/stations.module';
import { SequelizeModule } from '@nestjs/sequelize';
import { Parameterization } from './entities/parameterization.entity';

@Module({
  controllers: [],
  providers: [FtpService],
  exports: [FtpService],
  imports: [SequelizeModule.forFeature([Parameterization]), StationsModule],
})
export class FtpModule {}
