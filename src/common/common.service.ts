import { ConfigService } from '@nestjs/config';
import { Dependencies, Injectable } from '@nestjs/common';

import { EnvName } from '../config/app.config';
import { IPagination } from './interfaces/pagination.interface';

@Dependencies(ConfigService)
@Injectable()
export class CommonService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Get the value of a configuration variable with the given name from the
   * environment, cast to type T.
   *
   * @template T The type to cast the configuration variable to
   * @param {EnvName} name The name of the configuration variable to get
   * @returns {T} The value of the configuration variable cast to type T
   */
  getEnv<T>(name: EnvName): T {
    return this.configService.get<T>(name);
  }

  /**
   * Restores the data by validating that all elements in the property array are equal to the data properties.
   * @param page - Data page.
   * @param limit - Data limit to display.
   * @returns Object that represents the result of the pagination parse.
   */
  parsePagination({ page = 1, limit = 8 }: IPagination): IPagination {
    const pagination: IPagination = {
      page: Math.round(page),
      limit: Math.round(limit),
      offset: Math.round((page - 1) * limit),
    };

    return pagination;
  }
}
