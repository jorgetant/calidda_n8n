import { Module } from '@nestjs/common';
import { CronService } from './cron.service';
import { CronController } from './cron.controller';
import { FtpModule } from 'src/ftp/ftp.module';
import { StationsModule } from 'src/stations/stations.module';

@Module({
  controllers: [CronController],
  providers: [CronService],
  imports: [FtpModule, StationsModule],
})
export class CronModule {}
