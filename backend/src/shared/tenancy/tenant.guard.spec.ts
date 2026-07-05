import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';

function buildContext(
  user: { companyId?: number } | undefined,
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  it('permite el acceso cuando el usuario tiene companyId', () => {
    expect(guard.canActivate(buildContext({ companyId: 1 }))).toBe(true);
  });

  it('deniega el acceso cuando el usuario no tiene companyId (ej. Platform Owner sin impersonar)', () => {
    expect(() => guard.canActivate(buildContext({}))).toThrow(
      ForbiddenException,
    );
  });

  it('deniega el acceso cuando no hay usuario en la request', () => {
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
