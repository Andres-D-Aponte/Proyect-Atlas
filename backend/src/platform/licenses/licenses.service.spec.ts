import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { LicensesService } from './licenses.service';

function foreignKeyError(
  fieldName: string,
): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(
    'Foreign key constraint failed',
    {
      code: 'P2003',
      clientVersion: 'test',
      meta: { field_name: fieldName },
    },
  );
}

describe('LicensesService', () => {
  let service: LicensesService;
  let prisma: { license: { upsert: jest.Mock; findUnique: jest.Mock } };

  const dto = {
    planId: 1,
    billingCycle: 'MONTHLY' as const,
    endDate: '2026-08-05T00:00:00.000Z',
  };

  beforeEach(async () => {
    prisma = { license: { upsert: jest.fn(), findUnique: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicensesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(LicensesService);
  });

  it('asigna (crea o reemplaza) la licencia de una empresa', async () => {
    prisma.license.upsert.mockResolvedValue({ id: 1, companyId: 1, planId: 1 });

    const result = await service.assign(1, dto);

    expect(result).toEqual({ id: 1, companyId: 1, planId: 1 });
    expect(prisma.license.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 1 } }),
    );
  });

  it('rechaza con NotFoundException si la empresa no existe (FK companyId)', async () => {
    prisma.license.upsert.mockRejectedValue(
      foreignKeyError('License_companyId_fkey (index)'),
    );

    await expect(service.assign(999, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rechaza con NotFoundException si el plan no existe (FK planId)', async () => {
    prisma.license.upsert.mockRejectedValue(
      foreignKeyError('License_planId_fkey (index)'),
    );

    await expect(
      service.assign(1, { ...dto, planId: 999 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findByCompanyIdOrThrow lanza NotFoundException si no hay licencia', async () => {
    prisma.license.findUnique.mockResolvedValue(null);

    await expect(service.findByCompanyIdOrThrow(1)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
