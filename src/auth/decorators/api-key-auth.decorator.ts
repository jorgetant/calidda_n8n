import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';

export function ApiKeyAuth() {
  return applyDecorators(UseGuards(ApiKeyGuard));
}
