import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { BranchesService } from './branches.service';

describe('BranchesService', () => {
  let service: BranchesService;
  let prisma: {
    branch: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      branch: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(BranchesService);
  });

  it('crea una sucursal asociada a la empresa del actor', async () => {
    prisma.branch.create.mockResolvedValue({
      id: 1,
      companyId: 1,
      name: 'Centro',
    });

    await service.create(1, { name: 'Centro' });

    expect(prisma.branch.create).toHaveBeenCalledWith({
      data: { companyId: 1, name: 'Centro' },
    });
  });

  it('findByIdOrThrow busca por id y companyId a la vez (aislamiento entre empresas)', async () => {
    prisma.branch.findFirst.mockResolvedValue({ id: 5, companyId: 1 });

    await service.findByIdOrThrow(1, 5);

    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: { id: 5, companyId: 1 },
    });
  });

  it('findByIdOrThrow lanza NotFoundException si la sucursal es de otra empresa', async () => {
    prisma.branch.findFirst.mockResolvedValue(null);

    await expect(service.findByIdOrThrow(2, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('setSchedule verifica pertenencia antes de guardar el horario', async () => {
    prisma.branch.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.branch.update.mockResolvedValue({
      id: 5,
      companyId: 1,
      openingHours: [],
    });

    const schedule = [{ dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00' }];
    await service.setSchedule(1, 5, schedule);

    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: { id: 5, companyId: 1 },
    });
    expect(prisma.branch.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { openingHours: schedule },
    });
  });

  it('setSchedule rechaza si la sucursal no pertenece a la empresa del actor', async () => {
    prisma.branch.findFirst.mockResolvedValue(null);

    await expect(
      service.setSchedule(2, 5, [
        { dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00' },
      ]),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.branch.update).not.toHaveBeenCalled();
  });
});
