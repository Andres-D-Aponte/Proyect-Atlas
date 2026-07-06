import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UsersService } from './users.service';

function prismaKnownError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('mock', {
    code,
    clientVersion: 'mock',
  });
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  it('createBusinessAdmin crea un usuario con rol BUSINESS_ADMIN y no expone el passwordHash', async () => {
    prisma.user.create.mockResolvedValue({
      id: 1,
      email: 'admin@empresa.com',
      passwordHash: 'hash',
      role: Role.BUSINESS_ADMIN,
      isActive: true,
      companyId: 5,
    });

    const result = await service.createBusinessAdmin(5, {
      email: 'admin@empresa.com',
      password: 'ChangeMe123!',
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'admin@empresa.com',
        role: Role.BUSINESS_ADMIN,
        companyId: 5,
      }),
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('createCompanyUser propaga el rol solicitado (Supervisor o Recepcionista/Cajero)', async () => {
    prisma.user.create.mockResolvedValue({
      id: 2,
      email: 'staff@empresa.com',
      passwordHash: 'hash',
      role: Role.SUPERVISOR,
      isActive: true,
      companyId: 5,
    });

    await service.createCompanyUser(5, {
      email: 'staff@empresa.com',
      password: 'ChangeMe123!',
      role: Role.SUPERVISOR,
    });

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: Role.SUPERVISOR, companyId: 5 }),
    });
  });

  it('lanza ConflictException si el correo ya existe (P2002)', async () => {
    prisma.user.create.mockRejectedValue(prismaKnownError('P2002'));

    await expect(
      service.createCompanyUser(5, {
        email: 'duplicado@empresa.com',
        password: 'ChangeMe123!',
        role: Role.SUPERVISOR,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lanza NotFoundException si la empresa no existe (P2003)', async () => {
    prisma.user.create.mockRejectedValue(prismaKnownError('P2003'));

    await expect(
      service.createBusinessAdmin(999, {
        email: 'admin@empresa.com',
        password: 'ChangeMe123!',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('listManageableByCompany solo trae Supervisor y Recepcionista/Cajero de la propia empresa', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.listManageableByCompany(5);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 5,
        role: { in: [Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER] },
      },
      orderBy: { id: 'asc' },
    });
  });

  it('setActive verifica pertenencia a la empresa antes de actualizar', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 2,
      companyId: 5,
      role: Role.SUPERVISOR,
    });
    prisma.user.update.mockResolvedValue({
      id: 2,
      email: 'staff@empresa.com',
      passwordHash: 'hash',
      role: Role.SUPERVISOR,
      isActive: false,
      companyId: 5,
    });

    const result = await service.setActive(5, 2, false);

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: 2,
        companyId: 5,
        role: { in: [Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER] },
      },
    });
    expect(result.isActive).toBe(false);
  });

  it('setActive lanza NotFoundException si el usuario es de otra empresa', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.setActive(6, 2, false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
