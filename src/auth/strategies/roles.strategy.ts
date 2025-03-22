import { SetMetadata } from '@nestjs/common';
import { Role } from '../interfaces/roles.interface';

export const HasRoles = (...roles: Role[]) => SetMetadata('roles', roles);
