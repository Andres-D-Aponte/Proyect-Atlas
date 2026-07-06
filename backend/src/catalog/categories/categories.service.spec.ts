import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CategoriesService } from './categories.service';

function prismaKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mock', {
    code,
    clientVersion: 'mock',
  });
}

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    serviceCategory: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      serviceCategory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  it('crea una categoría asociada a la empresa del actor', async () => {
    prisma.serviceCategory.create.mockResolvedValue({
      id: 1,
      companyId: 1,
      name: 'Cortes',
    });

    await service.create(1, { name: 'Cortes' });

    expect(prisma.serviceCategory.create).toHaveBeenCalledWith({
      data: { companyId: 1, name: 'Cortes' },
    });
  });

  it('lanza ConflictException si ya existe una categoría con ese nombre en la empresa', async () => {
    prisma.serviceCategory.create.mockRejectedValue(prismaKnownError('P2002'));

    await expect(service.create(1, { name: 'Cortes' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('findByIdOrThrow busca por id y companyId a la vez (aislamiento entre empresas)', async () => {
    prisma.serviceCategory.findFirst.mockResolvedValue({ id: 5, companyId: 1 });

    await service.findByIdOrThrow(1, 5);

    expect(prisma.serviceCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 5, companyId: 1 },
    });
  });

  it('findByIdOrThrow lanza NotFoundException si la categoría es de otra empresa', async () => {
    prisma.serviceCategory.findFirst.mockResolvedValue(null);

    await expect(service.findByIdOrThrow(2, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update verifica pertenencia antes de renombrar', async () => {
    prisma.serviceCategory.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.serviceCategory.update.mockResolvedValue({
      id: 5,
      companyId: 1,
      name: 'Nuevo nombre',
    });

    await service.update(1, 5, { name: 'Nuevo nombre' });

    expect(prisma.serviceCategory.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { name: 'Nuevo nombre' },
    });
  });

  it('remove verifica pertenencia antes de borrar', async () => {
    prisma.serviceCategory.findFirst.mockResolvedValue({ id: 5, companyId: 1 });

    await service.remove(1, 5);

    expect(prisma.serviceCategory.delete).toHaveBeenCalledWith({
      where: { id: 5 },
    });
  });

  it('remove rechaza si la categoría no pertenece a la empresa del actor', async () => {
    prisma.serviceCategory.findFirst.mockResolvedValue(null);

    await expect(service.remove(2, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.serviceCategory.delete).not.toHaveBeenCalled();
  });
});
