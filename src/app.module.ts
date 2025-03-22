import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { ConfigModule } from '@nestjs/config';
import EnvConfig from './config/app.config';
import { SequelizeModule } from '@nestjs/sequelize';
import { SequelizeConfigService } from './common/database/connection';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { StationsModule } from './stations/stations.module';
import { SessionsModule } from './sessions/sessions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FtpModule } from './ftp/ftp.module';
import { CronModule } from './cron/cron.module';
import { ScheduleModule } from '@nestjs/schedule';
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Environments
    ConfigModule.forRoot({
      load: [EnvConfig],
      isGlobal: true,
    }),

    // Database
    SequelizeModule.forRootAsync({
      imports: [CommonModule],
      useClass: SequelizeConfigService,
    }),
    CommonModule,

    UsersModule,

    AuthModule,

    SessionsModule,

    StationsModule,

    NotificationsModule,

    FtpModule,

    CronModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
