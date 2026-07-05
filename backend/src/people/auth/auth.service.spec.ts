import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../../../generated/prisma';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let jwtService: { signAsync: jest.Mock };
  let refreshTokenService: {
    issue: jest.Mock;
    consume: jest.Mock;
    revoke: jest.Mock;
  };

  const activeUser = {
    id: 1,
    email: 'owner@atlas.dev',
    role: Role.PLATFORM_OWNER,
    isActive: true,
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    activeUser.passwordHash = await bcrypt.hash('ChangeMe123!', 4);

    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    refreshTokenService = {
      issue: jest.fn().mockResolvedValue('raw-refresh-token'),
      consume: jest.fn(),
      revoke: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('devuelve tokens cuando las credenciales son correctas', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);

      const result = await service.login('owner@atlas.dev', 'ChangeMe123!');

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
      });
      expect(refreshTokenService.issue).toHaveBeenCalledWith(activeUser.id);
    });

    it('rechaza cuando el usuario no existe', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('nadie@atlas.dev', 'ChangeMe123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza cuando el usuario está inactivo', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...activeUser,
        isActive: false,
      });

      await expect(
        service.login('owner@atlas.dev', 'ChangeMe123!'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza cuando la contraseña es incorrecta', async () => {
      usersService.findByEmail.mockResolvedValue(activeUser);

      await expect(
        service.login('owner@atlas.dev', 'contraseña-incorrecta'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rota el refresh token y devuelve tokens nuevos', async () => {
      refreshTokenService.consume.mockResolvedValue({ userId: activeUser.id });
      usersService.findById.mockResolvedValue(activeUser);

      const result = await service.refresh('raw-refresh-token');

      expect(refreshTokenService.consume).toHaveBeenCalledWith(
        'raw-refresh-token',
      );
      expect(result.accessToken).toBe('signed.jwt.token');
    });

    it('propaga el rechazo si el refresh token es inválido', async () => {
      refreshTokenService.consume.mockRejectedValue(
        new UnauthorizedException(),
      );

      await expect(service.refresh('token-invalido')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('revoca el refresh token presentado', async () => {
      await service.logout('raw-refresh-token');

      expect(refreshTokenService.revoke).toHaveBeenCalledWith(
        'raw-refresh-token',
      );
    });
  });

  describe('issueImpersonationTokens', () => {
    it('emite tokens con role BUSINESS_ADMIN y companyId cuando el actor es Platform Owner', async () => {
      usersService.findById.mockResolvedValue(activeUser);

      const result = await service.issueImpersonationTokens(activeUser.id, 42);

      expect(result).toEqual({
        accessToken: 'signed.jwt.token',
        refreshToken: 'raw-refresh-token',
      });
      const [payload] = jwtService.signAsync.mock.calls[0];
      expect(payload).toMatchObject({
        sub: activeUser.id,
        role: Role.BUSINESS_ADMIN,
        companyId: 42,
        impersonatedBy: activeUser.id,
      });
    });

    it('rechaza si el usuario no es Platform Owner', async () => {
      usersService.findById.mockResolvedValue({
        ...activeUser,
        role: Role.BUSINESS_ADMIN,
      });

      await expect(
        service.issueImpersonationTokens(activeUser.id, 42),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza si el usuario no existe', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.issueImpersonationTokens(999, 42),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
