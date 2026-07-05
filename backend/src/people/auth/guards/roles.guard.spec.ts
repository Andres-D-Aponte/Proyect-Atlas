import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../../../generated/prisma';
import { RolesGuard } from './roles.guard';

function buildContext(user: { role: Role } | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('permite el acceso cuando el endpoint no exige ningún rol', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ role: Role.PROFESSIONAL }))).toBe(
      true,
    );
  });

  it('permite el acceso cuando el rol del usuario está autorizado', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.BUSINESS_ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ role: Role.BUSINESS_ADMIN }))).toBe(
      true,
    );
  });

  it('deniega el acceso cuando el rol del usuario no está autorizado', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.BUSINESS_ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext({ role: Role.PROFESSIONAL }))).toBe(
      false,
    );
  });

  it('deniega el acceso cuando no hay usuario en la request', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([Role.BUSINESS_ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
