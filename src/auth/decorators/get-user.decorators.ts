import {
  ExecutionContext,
  InternalServerErrorException,
  createParamDecorator,
} from '@nestjs/common';

export const GetUser = createParamDecorator((_, context: ExecutionContext) => {
  const { user } = context.switchToHttp().getRequest();
  if (!user) throw new InternalServerErrorException('User not found');

  return user;
});
