import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformResponseInterceptor } from './core/interceptors/httpHeadersResponse.interceptor';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // Api endpoint prefix
  app.setGlobalPrefix('api');

  //Interceptors
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Setup validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(3000);
  console.log(`Server is running on port 3000`);
}
bootstrap();
