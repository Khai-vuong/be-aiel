// roles.decorator.ts
// Specify roles allowed to access a route, this goes with RolesGuard
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);