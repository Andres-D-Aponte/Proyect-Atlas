import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma';
import { AuthService } from '../../people/auth/auth.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ImpersonationService } from './impersonation.service';

describe('ImpersonationService', () => {
  let service: ImpersonationService;
  let prisma: { impersonationLog: { create: jest.Mock } };
  let authService: { issueImpersonationTokens: jest.Mock };

  beforeEach(async () => {
    prisma = { impersonationLog: { create: jest.fn() } };
    authService = {
      issueImpersonationTokens: jest
        .fn()
        .mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpersonationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get(ImpersonationService);
  });

  it('registra el motivo en auditoría y luego emite los tokens', async () => {
    prisma.impersonationLog.create.mockResolvedValue({ id: 1 });

    const result = await service.impersonate(
      1,
      2,
      'Soporte técnico',
      '127.0.0.1',
    );

    expect(prisma.impersonationLog.create).toHaveBeenCalledWith({
      data: {
        platformOwnerId: 1,
        companyId: 2,
        reason: 'Soporte técnico',
        ipAddress: '127.0.0.1',
      },
    });
    expect(authService.issueImpersonationTokens).toHaveBeenCalledWith(1, 2);
    expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh' });
  });

  it('rechaza con NotFoundException si la empresa no existe, sin emitir tokens', async () => {
    prisma.impersonationLog.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        {
          code: 'P2003',
          clientVersion: 'test',
          meta: { field_name: 'ImpersonationLog_companyId_fkey (index)' },
        },
      ),
    );

    await expect(
      service.impersonate(1, 999, 'Soporte técnico', undefined),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(authService.issueImpersonationTokens).not.toHaveBeenCalled();
  });
});
