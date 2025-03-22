import { CommonService } from '../common.service';
import { Dependencies, Injectable } from '@nestjs/common';
import {
  SequelizeModuleOptions,
  SequelizeOptionsFactory,
} from '@nestjs/sequelize';
import { Parameterization } from 'src/ftp/entities/parameterization.entity';
import { LogUser } from 'src/sessions/entities/logUser.entity';
import { Session } from 'src/sessions/entities/session.entity';
import { PopularTimes } from 'src/stations/entities/popular_times.entity';
import { Saturation } from 'src/stations/entities/saturation.entity';
import { Station } from 'src/stations/entities/station.entity';
import { VisitStation } from 'src/stations/entities/visitStation.entity';
import { User } from 'src/users/entities/user.entity';
import { Prices } from 'src/stations/entities/prices.entity';
@Dependencies(CommonService)
@Injectable()
export class SequelizeConfigService implements SequelizeOptionsFactory {
  constructor(private readonly commonService: CommonService) {}

  private readonly models = [
    User,
    Session,
    Station,
    LogUser,
    VisitStation,
    PopularTimes,
    Saturation,
    Parameterization,
    Prices,
  ];

  createSequelizeOptions(): SequelizeModuleOptions {
    const port = this.commonService.getEnv<number>('DB_PORT');
    const host = this.commonService.getEnv<string>('DB_HOST');
    const password = this.commonService.getEnv<string>('DB_PASS');
    const username = this.commonService.getEnv<string>('DB_USER');
    const database = this.commonService.getEnv<string>('DB');

    const migrate = this.models;

    const sequelizeOptions: SequelizeModuleOptions = {
      dialect: 'mssql',
      logging: true,
      dialectOptions: {
        options: {
          encrypt: false,
          enableArithAbort: true,
          requestTimeout: 30000,
        },
      },
      models: [...this.models],
      host,
      username,
      password,
      database,
      port,

      //DB Synchronization
      // autoLoadModels: true,
    };

    if (sequelizeOptions.autoLoadModels != undefined) {
      sequelizeOptions.hooks = {
        beforeBulkSync: async () => {
          for (const model of migrate) {
            await model.sync({
              alter: true,
            });
          }
        },
      };
    }

    return sequelizeOptions;
  }
}
