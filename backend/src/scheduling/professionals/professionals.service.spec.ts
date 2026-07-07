import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ProfessionalsService } from './professionals.service';

describe('ProfessionalsService', () => {
  let service: ProfessionalsService;
  let prisma: {
    professional: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    professionalSchedule: {
      deleteMany: jest.Mock;
      createMany: jest.Mock;
    };
    professionalBlock: {
      create: jest.Mock;
      findFirst: jest.Mock;
      delete: jest.Mock;
    };
    branch: {
      count: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      professional: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      professionalSchedule: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      professionalBlock: {
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
      branch: { count: jest.fn() },
      user: { findFirst: jest.fn() },
      $transaction: jest.fn((ops: unknown[]) =>
        Promise.all(ops as Promise<unknown>[]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProfessionalsService);
  });

  it('crea un profesional sin usuario vinculado', async () => {
    prisma.professional.create.mockResolvedValue({
      id: 1,
      companyId: 1,
      name: 'Carlos',
    });

    await service.create(1, { name: 'Carlos' });

    expect(prisma.user.findFirst).not.toHaveBeenCalled();
    expect(prisma.professional.create).toHaveBeenCalledWith({
      data: { companyId: 1, name: 'Carlos', userId: undefined },
    });
  });

  it('valida que el usuario a vincular tenga rol Profesional en la misma empresa', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 9,
      companyId: 1,
      role: Role.PROFESSIONAL,
    });
    prisma.professional.findUnique.mockResolvedValue(null);
    prisma.professional.create.mockResolvedValue({
      id: 1,
      companyId: 1,
      name: 'Carlos',
      userId: 9,
    });

    await service.create(1, { name: 'Carlos', userId: 9 });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 9, companyId: 1, role: Role.PROFESSIONAL },
    });
  });

  it('rechaza vincular un usuario que no existe o no tiene rol Profesional', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(1, { name: 'Carlos', userId: 9 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.professional.create).not.toHaveBeenCalled();
  });

  it('rechaza vincular un usuario ya vinculado a otro profesional', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 9,
      companyId: 1,
      role: Role.PROFESSIONAL,
    });
    prisma.professional.findUnique.mockResolvedValue({ id: 5, userId: 9 });

    await expect(
      service.create(1, { name: 'Carlos', userId: 9 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('findByIdOrThrow lanza NotFoundException si el profesional es de otra empresa', async () => {
    prisma.professional.findFirst.mockResolvedValue(null);

    await expect(service.findByIdOrThrow(2, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('setSchedule valida que las sucursales pertenezcan a la empresa antes de reemplazar el horario', async () => {
    prisma.professional.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.branch.count.mockResolvedValue(1);
    prisma.professionalSchedule.deleteMany.mockResolvedValue({ count: 0 });
    prisma.professionalSchedule.createMany.mockResolvedValue({ count: 1 });

    const schedule = [
      { branchId: 1, dayOfWeek: 1, startsAt: '09:00', endsAt: '18:00' },
    ];
    await service.setSchedule(1, 5, schedule);

    expect(prisma.branch.count).toHaveBeenCalledWith({
      where: { id: { in: [1] }, companyId: 1 },
    });
    expect(prisma.professionalSchedule.deleteMany).toHaveBeenCalledWith({
      where: { professionalId: 5 },
    });
    expect(prisma.professionalSchedule.createMany).toHaveBeenCalledWith({
      data: [
        {
          branchId: 1,
          dayOfWeek: 1,
          startsAt: '09:00',
          endsAt: '18:00',
          professionalId: 5,
        },
      ],
    });
  });

  it('setSchedule rechaza si alguna sucursal no pertenece a la empresa', async () => {
    prisma.professional.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.branch.count.mockResolvedValue(0);

    const schedule = [
      { branchId: 99, dayOfWeek: 1, startsAt: '09:00', endsAt: '18:00' },
    ];
    await expect(service.setSchedule(1, 5, schedule)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.professionalSchedule.deleteMany).not.toHaveBeenCalled();
  });

  it('createBlock rechaza si la fecha de fin no es posterior a la de inicio', async () => {
    prisma.professional.findFirst.mockResolvedValue({ id: 5, companyId: 1 });

    await expect(
      service.createBlock(1, 5, {
        type: 'VACATION',
        startAt: '2026-08-10T00:00:00.000Z',
        endAt: '2026-08-01T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('removeBlock rechaza si el bloqueo no pertenece al profesional', async () => {
    prisma.professional.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.professionalBlock.findFirst.mockResolvedValue(null);

    await expect(service.removeBlock(1, 5, 42)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.professionalBlock.delete).not.toHaveBeenCalled();
  });
});
