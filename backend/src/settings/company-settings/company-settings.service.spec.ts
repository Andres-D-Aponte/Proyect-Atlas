import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CompanySettingsService } from './company-settings.service';

describe('CompanySettingsService', () => {
  let service: CompanySettingsService;
  let prisma: { company: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = { company: { findUnique: jest.fn(), update: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanySettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CompanySettingsService);
  });

  it('findOrThrow lanza NotFoundException si la empresa no existe', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.findOrThrow(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update lanza NotFoundException si la empresa no existe, sin llamar a update', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(
      service.update(99, { currency: 'USD' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.company.update).not.toHaveBeenCalled();
  });

  it('update guarda los cambios cuando la empresa existe', async () => {
    prisma.company.findUnique.mockResolvedValue({ id: 1 });
    prisma.company.update.mockResolvedValue({ id: 1, currency: 'USD' });

    const result = await service.update(1, { currency: 'USD' });

    expect(prisma.company.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { currency: 'USD' },
    });
    expect(result).toEqual({ id: 1, currency: 'USD' });
  });
});
