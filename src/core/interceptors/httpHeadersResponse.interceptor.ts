import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Response as ExpressResponse } from 'express';
export interface Response<T> {
  statusCode: number;
  message: string;
  data: {
    headers: any;
  };
}

@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const nextDone: any = next.handle().pipe(
      map((data) => {
        const response: ExpressResponse = context.switchToHttp().getResponse();

        if (data?.headers) {
          Object.keys(data.headers).forEach((key) => {
            response.setHeader(key, data?.headers[key]);
          });
        }
        const responseData = {
          statusCode: response.statusCode,
          message: data?.message,
          meta: data?.meta,
        };

        delete data?.message;
        delete data?.meta;
        delete data?.headers;

        responseData['data'] = data;

        return responseData;
      }),
    );
    return nextDone;
  }
}
