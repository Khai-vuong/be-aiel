// public.decorator.ts
// Mark the route as public (no authentication required). This goes with JwtGuard
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
