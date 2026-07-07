import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ScheduleExceptionsService } from './schedule-exceptions.service';

describe('ScheduleExceptionsService', () => {
  let service: ScheduleExceptionsService;
  let prisma: {
    scheduleException: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    branch: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      scheduleException: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      branch: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleExceptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ScheduleExceptionsService);
  });

  it('crea una excepción global (sin sucursal) sin validar sucursal', async () => {
    prisma.scheduleException.create.mockResolvedValue({ id: 1 });

    await service.create(1, { date: '2026-12-25', reason: 'Navidad' });

    expect(prisma.branch.findFirst).not.toHaveBeenCalled();
    expect(prisma.scheduleException.create).toHaveBeenCalledWith({
      data: {
        companyId: 1,
        branchId: undefined,
        date: new Date('2026-12-25'),
        reason: 'Navidad',
      },
    });
  });

  it('valida que la sucursal pertenezca a la empresa cuando se indica', async () => {
    prisma.branch.findFirst.mockResolvedValue(null);

    await expect(
      service.create(1, {
        branchId: 99,
        date: '2026-12-25',
        reason: 'Navidad',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.scheduleException.create).not.toHaveBeenCalled();
  });

  it('remove rechaza si la excepción no pertenece a la empresa', async () => {
    prisma.scheduleException.findFirst.mockResolvedValue(null);

    await expect(service.remove(1, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.scheduleException.delete).not.toHaveBeenCalled();
  });

  it('isDateBlocked es true si existe una excepción global o de la sucursal ese día', async () => {
    prisma.scheduleException.count.mockResolvedValue(1);

    const result = await service.isDateBlocked(
      1,
      2,
      new Date('2026-12-25T15:30:00.000Z'),
    );

    expect(result).toBe(true);
    expect(prisma.scheduleException.count).toHaveBeenCalledWith({
      where: {
        companyId: 1,
        date: new Date(Date.UTC(2026, 11, 25)),
        OR: [{ branchId: null }, { branchId: 2 }],
      },
    });
  });

  it('isDateBlocked es false si no hay excepciones ese día', async () => {
    prisma.scheduleException.count.mockResolvedValue(0);

    const result = await service.isDateBlocked(
      1,
      2,
      new Date('2026-12-25T15:30:00.000Z'),
    );

    expect(result).toBe(false);
  });
});
