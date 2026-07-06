import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ServicesService } from './services.service';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: {
    service: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    serviceCategory: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      service: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      serviceCategory: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ServicesService);
  });

  it('crea un servicio sin categoría sin validar nada extra', async () => {
    prisma.service.create.mockResolvedValue({
      id: 1,
      companyId: 1,
      name: 'Corte',
    });

    await service.create(1, {
      name: 'Corte',
      durationMinutes: 30,
      price: 35000,
    });

    expect(prisma.serviceCategory.findFirst).not.toHaveBeenCalled();
    expect(prisma.service.create).toHaveBeenCalledWith({
      data: { companyId: 1, name: 'Corte', durationMinutes: 30, price: 35000 },
    });
  });

  it('crea un servicio validando que la categoría pertenezca a la misma empresa', async () => {
    prisma.serviceCategory.findFirst.mockResolvedValue({ id: 9, companyId: 1 });
    prisma.service.create.mockResolvedValue({
      id: 1,
      companyId: 1,
      categoryId: 9,
    });

    await service.create(1, {
      name: 'Corte',
      durationMinutes: 30,
      price: 35000,
      categoryId: 9,
    });

    expect(prisma.serviceCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 9, companyId: 1 },
    });
    expect(prisma.service.create).toHaveBeenCalled();
  });

  it('rechaza crear un servicio con una categoría de otra empresa', async () => {
    prisma.serviceCategory.findFirst.mockResolvedValue(null);

    await expect(
      service.create(1, {
        name: 'Corte',
        durationMinutes: 30,
        price: 35000,
        categoryId: 9,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.service.create).not.toHaveBeenCalled();
  });

  it('findByIdOrThrow busca por id y companyId a la vez (aislamiento entre empresas)', async () => {
    prisma.service.findFirst.mockResolvedValue({ id: 5, companyId: 1 });

    await service.findByIdOrThrow(1, 5);

    expect(prisma.service.findFirst).toHaveBeenCalledWith({
      where: { id: 5, companyId: 1 },
      include: { category: true },
    });
  });

  it('findByIdOrThrow lanza NotFoundException si el servicio es de otra empresa', async () => {
    prisma.service.findFirst.mockResolvedValue(null);

    await expect(service.findByIdOrThrow(2, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update verifica pertenencia y valida la nueva categoría si se envía', async () => {
    prisma.service.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.serviceCategory.findFirst.mockResolvedValue({ id: 9, companyId: 1 });
    prisma.service.update.mockResolvedValue({
      id: 5,
      companyId: 1,
      categoryId: 9,
    });

    await service.update(1, 5, { categoryId: 9 });

    expect(prisma.serviceCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 9, companyId: 1 },
    });
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { categoryId: 9 },
    });
  });

  it('update permite quitar la categoría enviando null sin validar nada extra', async () => {
    prisma.service.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.service.update.mockResolvedValue({
      id: 5,
      companyId: 1,
      categoryId: null,
    });

    await service.update(1, 5, { categoryId: null });

    expect(prisma.serviceCategory.findFirst).not.toHaveBeenCalled();
    expect(prisma.service.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { categoryId: null },
    });
  });

  it('update rechaza si el servicio no pertenece a la empresa del actor', async () => {
    prisma.service.findFirst.mockResolvedValue(null);

    await expect(service.update(2, 5, { price: 1000 })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.service.update).not.toHaveBeenCalled();
  });
});
