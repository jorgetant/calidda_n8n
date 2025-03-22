import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Session } from './entities/session.entity';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { LogUserAccessDto } from 'src/auth/dto/login.dto';
import { LogUser } from './entities/logUser.entity';

@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session)
    private sessionModel: typeof Session,
    @InjectModel(LogUser)
    private logUserModel: typeof LogUser,
  ) {}

  create(createSessionDto: CreateSessionDto) {
    return this.sessionModel.create({ ...createSessionDto });
  }

  findAll() {
    return this.sessionModel.findAll();
  }

  findOne(plate: string) {
    return this.sessionModel.findOne({ where: { plate } });
  }

  update(id: string, updateSessionDto: UpdateSessionDto) {
    return this.sessionModel.update({ ...updateSessionDto }, { where: { id } });
  }

  remove(id: string) {
    return this.sessionModel.destroy({ where: { id } });
  }

  async saveUserToken(
    plate: string,
    token: string,
    calidda_token: string,
  ): Promise<void> {
    const existingSession = await this.sessionModel.findOne({
      where: { plate },
    });
    try {
      if (existingSession) {
        await this.sessionModel.update(
          {
            token,
            calidda_token,
          },
          {
            where: { plate },
          },
        );
      } else {
        await this.sessionModel.create({
          plate,
          token,
          calidda_token,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  async isTokenValid(token: string): Promise<boolean> {
    const session = await this.sessionModel.findOne({
      where: { token },
    });

    if (!session) {
      return false;
    }

    return true;
  }

  async saveUserAccess(plate: string, logUserAccessDto: LogUserAccessDto) {
    await this.logUserModel.create({
      plate,
      timestamp: logUserAccessDto.timestamp || new Date(),
      ...logUserAccessDto,
    });
  }
}
