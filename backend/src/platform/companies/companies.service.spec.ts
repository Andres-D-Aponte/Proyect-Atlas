import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CompaniesService } from './companies.service';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let prisma: {
    company: { create: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      company: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CompaniesService);
  });

  it('crea una empresa', async () => {
    prisma.company.create.mockResolvedValue({ id: 1, name: 'Elegance' });

    await service.create({ name: 'Elegance' });

    expect(prisma.company.create).toHaveBeenCalledWith({
      data: { name: 'Elegance' },
    });
  });

  it('findByIdOrThrow lanza NotFoundException si no existe', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.findByIdOrThrow(99)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findByIdOrThrow devuelve la empresa con su licencia si existe', async () => {
    prisma.company.findUnique.mockResolvedValue({
      id: 1,
      name: 'Elegance',
      license: null,
    });

    await expect(service.findByIdOrThrow(1)).resolves.toEqual({
      id: 1,
      name: 'Elegance',
      license: null,
    });
  });
});
