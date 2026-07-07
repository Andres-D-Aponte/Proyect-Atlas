import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ResourcesService } from './resources.service';

describe('ResourcesService', () => {
  let service: ResourcesService;
  let prisma: {
    resource: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    branch: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      resource: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      branch: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourcesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ResourcesService);
  });

  it('crea un recurso si la sucursal pertenece a la empresa', async () => {
    prisma.branch.findFirst.mockResolvedValue({ id: 1, companyId: 1 });
    prisma.resource.create.mockResolvedValue({ id: 1, name: 'Silla 1' });

    await service.create(1, {
      branchId: 1,
      type: 'CHAIR',
      name: 'Silla 1',
    });

    expect(prisma.resource.create).toHaveBeenCalledWith({
      data: { companyId: 1, branchId: 1, type: 'CHAIR', name: 'Silla 1' },
    });
  });

  it('rechaza crear un recurso en una sucursal de otra empresa', async () => {
    prisma.branch.findFirst.mockResolvedValue(null);

    await expect(
      service.create(1, {
        branchId: 99,
        type: 'CHAIR',
        name: 'Silla 1',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.resource.create).not.toHaveBeenCalled();
  });

  it('findAll filtra por sucursal cuando se indica', async () => {
    prisma.resource.findMany.mockResolvedValue([]);

    await service.findAll(1, 2);

    expect(prisma.resource.findMany).toHaveBeenCalledWith({
      where: { companyId: 1, branchId: 2 },
      orderBy: { name: 'asc' },
    });
  });

  it('findByIdOrThrow lanza NotFoundException si el recurso es de otra empresa', async () => {
    prisma.resource.findFirst.mockResolvedValue(null);

    await expect(service.findByIdOrThrow(1, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update valida tenencia antes de actualizar', async () => {
    prisma.resource.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.resource.update.mockResolvedValue({ id: 5, name: 'Silla 2' });

    await service.update(1, 5, { name: 'Silla 2' });

    expect(prisma.resource.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { name: 'Silla 2' },
    });
  });
});
