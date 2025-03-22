import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from 'src/common/common.module';
import { CommonService } from 'src/common/common.service';
import { SessionsModule } from 'src/sessions/sessions.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { StationsModule } from 'src/stations/stations.module';
import { JwtAuthGuard } from './guards/jwt.guard';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    UsersModule,
    SessionsModule,
    PassportModule,
    CommonModule,
    StationsModule,
    HttpModule,
    JwtModule.registerAsync({
      imports: [CommonModule],
      inject: [CommonService],
      useFactory: async (commonService: CommonService) => ({
        secret: await commonService.getEnv<string>('JWT_KEY'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}
