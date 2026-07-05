import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { PlansService } from './plans.service';

describe('PlansService', () => {
  let service: PlansService;
  let prisma: {
    plan: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      plan: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlansService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PlansService);
  });

  it('crea un plan usando [] como enabledModules por defecto', async () => {
    prisma.plan.create.mockResolvedValue({ id: 1 });

    await service.create({ name: 'Starter' });

    expect(prisma.plan.create).toHaveBeenCalledWith({
      data: { name: 'Starter', enabledModules: [] },
    });
  });

  it('lista los planes ordenados por id', async () => {
    prisma.plan.findMany.mockResolvedValue([{ id: 1 }]);

    const result = await service.findAll();

    expect(result).toEqual([{ id: 1 }]);
    expect(prisma.plan.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
    });
  });

  it('findByIdOrThrow lanza NotFoundException si no existe', async () => {
    prisma.plan.findUnique.mockResolvedValue(null);

    await expect(service.findByIdOrThrow(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findByIdOrThrow devuelve el plan si existe', async () => {
    prisma.plan.findUnique.mockResolvedValue({ id: 1, name: 'Starter' });

    await expect(service.findByIdOrThrow(1)).resolves.toEqual({
      id: 1,
      name: 'Starter',
    });
  });
});
