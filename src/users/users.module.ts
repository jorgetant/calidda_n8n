import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { User } from './entities/user.entity';
import { CommonModule } from 'src/common/common.module';
import { HttpModule } from '@nestjs/axios';
import { SessionsModule } from 'src/sessions/sessions.module';
@Module({
  imports: [
    SequelizeModule.forFeature([User]),
    CommonModule,
    HttpModule,
    SessionsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
