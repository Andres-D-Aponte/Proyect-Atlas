import { createHash } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '../../shared/config/app-config.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: AppConfigService, useValue: { refreshTokenTtlDays: 30 } },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  it('issue genera un token y persiste solo su hash', async () => {
    const rawToken = await service.issue(1);

    expect(rawToken).toHaveLength(128);
    const createArgs = prisma.refreshToken.create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe(1);
    expect(createArgs.data.tokenHash).toBe(
      createHash('sha256').update(rawToken).digest('hex'),
    );
  });

  it('consume acepta un token válido y lo revoca', async () => {
    const future = new Date(Date.now() + 60_000);
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 1,
      revokedAt: null,
      expiresAt: future,
    });

    const result = await service.consume('raw-token');

    expect(result.userId).toBe(1);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { id: 'rt-1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('consume rechaza si otra petición concurrente ya lo revocó justo antes (carrera)', async () => {
    // findUnique todavía lo ve como válido (llegó justo antes de que la otra
    // petición terminara su updateMany), pero el updateMany condicionado a
    // revokedAt: null no afecta ninguna fila porque la otra ya ganó la carrera.
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 1,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.consume('raw-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('consume rechaza un token inexistente', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);

    await expect(service.consume('raw-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('consume rechaza un token ya revocado (evita reutilización)', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 1,
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(service.consume('raw-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('consume rechaza un token expirado', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt-1',
      userId: 1,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 60_000),
    });

    await expect(service.consume('raw-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
