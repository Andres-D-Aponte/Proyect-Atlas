import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../people/auth/auth-user.interface';

/**
 * Exige que el usuario autenticado tenga contexto de empresa (`companyId`).
 * Se usa junto a `JwtAuthGuard` + `RolesGuard` en todo endpoint que opera
 * sobre datos de una empresa específica (Business Admin, o Platform Owner
 * impersonando). Ver docs/02_Architecture.md sección 5.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (typeof request.user?.companyId !== 'number') {
      throw new ForbiddenException('Esta acción requiere contexto de empresa');
    }

    return true;
  }
}
