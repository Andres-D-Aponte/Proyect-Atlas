import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistStatus } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { WaitlistService } from './waitlist.service';

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prisma: {
    waitlist: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    branch: { findFirst: jest.Mock };
    client: { findFirst: jest.Mock };
    service: { findFirst: jest.Mock };
    professional: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      waitlist: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      branch: { findFirst: jest.fn() },
      client: { findFirst: jest.fn() },
      service: { findFirst: jest.fn() },
      professional: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(WaitlistService);
  });

  const baseDto = { branchId: 1, clientId: 2, serviceId: 3 };

  it('crea una entrada cuando sucursal, cliente y servicio pertenecen a la empresa', async () => {
    prisma.branch.findFirst.mockResolvedValue({ id: 1, companyId: 1 });
    prisma.client.findFirst.mockResolvedValue({ id: 2, companyId: 1 });
    prisma.service.findFirst.mockResolvedValue({ id: 3, companyId: 1 });
    prisma.waitlist.create.mockResolvedValue({ id: 10 });

    await service.create(1, baseDto);

    expect(prisma.waitlist.create).toHaveBeenCalledWith({
      data: {
        companyId: 1,
        branchId: 1,
        clientId: 2,
        serviceId: 3,
        professionalId: undefined,
      },
    });
  });

  it('rechaza si la sucursal no pertenece a la empresa', async () => {
    prisma.branch.findFirst.mockResolvedValue(null);

    await expect(service.create(1, baseDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.waitlist.create).not.toHaveBeenCalled();
  });

  it('rechaza si el profesional preferido no pertenece a la empresa', async () => {
    prisma.branch.findFirst.mockResolvedValue({ id: 1, companyId: 1 });
    prisma.client.findFirst.mockResolvedValue({ id: 2, companyId: 1 });
    prisma.service.findFirst.mockResolvedValue({ id: 3, companyId: 1 });
    prisma.professional.findFirst.mockResolvedValue(null);

    await expect(
      service.create(1, { ...baseDto, professionalId: 7 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.waitlist.create).not.toHaveBeenCalled();
  });

  it('cancel rechaza si la entrada ya fue convertida en cita', async () => {
    prisma.waitlist.findFirst.mockResolvedValue({
      id: 5,
      status: WaitlistStatus.CONVERTED,
    });

    await expect(service.cancel(1, 5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.waitlist.update).not.toHaveBeenCalled();
  });

  it('cancel marca la entrada como CANCELLED cuando es válido', async () => {
    prisma.waitlist.findFirst.mockResolvedValue({
      id: 5,
      status: WaitlistStatus.WAITING,
    });
    prisma.waitlist.update.mockResolvedValue({
      id: 5,
      status: WaitlistStatus.CANCELLED,
    });

    await service.cancel(1, 5);

    expect(prisma.waitlist.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { status: WaitlistStatus.CANCELLED },
    });
  });

  it('offerNextMatch devuelve null si no hay candidatos esperando', async () => {
    prisma.waitlist.findFirst.mockResolvedValue(null);

    const result = await service.offerNextMatch(1, 1, 3, 9);

    expect(result).toBeNull();
    expect(prisma.waitlist.update).not.toHaveBeenCalled();
  });

  it('offerNextMatch marca al primer candidato compatible como OFFERED', async () => {
    prisma.waitlist.findFirst.mockResolvedValue({
      id: 8,
      status: WaitlistStatus.WAITING,
    });
    prisma.waitlist.update.mockResolvedValue({
      id: 8,
      status: WaitlistStatus.OFFERED,
    });

    const result = await service.offerNextMatch(1, 1, 3, 9);

    expect(prisma.waitlist.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 1,
        branchId: 1,
        serviceId: 3,
        status: WaitlistStatus.WAITING,
        OR: [{ professionalId: null }, { professionalId: 9 }],
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(prisma.waitlist.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: { status: WaitlistStatus.OFFERED, offeredAt: expect.any(Date) },
    });
    expect(result).toEqual({ id: 8, status: WaitlistStatus.OFFERED });
  });
});
