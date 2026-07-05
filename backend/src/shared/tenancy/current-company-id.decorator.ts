import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../people/auth/auth-user.interface';

/**
 * Extrae el `companyId` del usuario autenticado. Asume que `TenantGuard` ya
 * corrió y garantizó su presencia; lanza de todas formas si no está, para no
 * fallar en silencio si algún endpoint olvida aplicar el guard.
 */
export const CurrentCompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): number => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const companyId = request.user?.companyId;

    if (typeof companyId !== 'number') {
      throw new ForbiddenException('Esta acción requiere contexto de empresa');
    }

    return companyId;
  },
);
