import { Module } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { Session } from './entities/session.entity';
import { SequelizeModule } from '@nestjs/sequelize';
import { LogUser } from './entities/logUser.entity';

@Module({
  imports: [SequelizeModule.forFeature([Session, LogUser])],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
