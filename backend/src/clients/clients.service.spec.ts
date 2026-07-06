import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientTimelineEventType } from '../../generated/prisma';
import { PrismaService } from '../shared/prisma/prisma.service';
import { ClientsService } from './clients.service';

describe('ClientsService', () => {
  let service: ClientsService;
  let prisma: {
    client: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    clientTimelineEvent: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    company: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      client: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      clientTimelineEvent: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      company: {
        findUnique: jest.fn().mockResolvedValue({
          requireClientEmail: false,
          requireClientDocument: false,
          requireClientAddress: false,
        }),
      },
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ClientsService);
  });

  it('crea un cliente y registra el evento CREATED en su línea de tiempo', async () => {
    prisma.client.create.mockResolvedValue({
      id: 1,
      companyId: 1,
      name: 'María',
      phone: '300',
    });

    const result = await service.create(1, { name: 'María', phone: '300' });

    expect(prisma.client.create).toHaveBeenCalledWith({
      data: { companyId: 1, name: 'María', phone: '300' },
    });
    expect(prisma.clientTimelineEvent.create).toHaveBeenCalledWith({
      data: {
        clientId: 1,
        type: ClientTimelineEventType.CREATED,
        description: 'Cliente registrado.',
      },
    });
    expect(result.id).toBe(1);
  });

  it('rechaza crear un cliente sin correo si la empresa lo exige', async () => {
    prisma.company.findUnique.mockResolvedValue({
      requireClientEmail: true,
      requireClientDocument: false,
      requireClientAddress: false,
    });

    await expect(
      service.create(1, { name: 'María', phone: '300' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.client.create).not.toHaveBeenCalled();
  });

  it('acepta crear un cliente sin correo/documento/dirección si nada es obligatorio', async () => {
    prisma.client.create.mockResolvedValue({
      id: 2,
      companyId: 1,
      name: 'Juan',
      phone: '301',
    });

    await expect(
      service.create(1, { name: 'Juan', phone: '301' }),
    ).resolves.toBeDefined();
  });

  it('findAll sin búsqueda filtra solo por companyId', async () => {
    prisma.client.findMany.mockResolvedValue([]);

    await service.findAll(1);

    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: { companyId: 1 },
      orderBy: { name: 'asc' },
    });
  });

  it('findAll con búsqueda filtra por nombre/teléfono/correo', async () => {
    prisma.client.findMany.mockResolvedValue([]);

    await service.findAll(1, 'maria');

    expect(prisma.client.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 1,
        OR: [
          { name: { contains: 'maria', mode: 'insensitive' } },
          { phone: { contains: 'maria', mode: 'insensitive' } },
          { email: { contains: 'maria', mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
    });
  });

  it('findByIdOrThrow lanza NotFoundException si el cliente es de otra empresa', async () => {
    prisma.client.findFirst.mockResolvedValue(null);

    await expect(service.findByIdOrThrow(2, 5)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('update registra en la línea de tiempo solo los campos que realmente cambiaron', async () => {
    prisma.client.findFirst.mockResolvedValue({
      id: 5,
      companyId: 1,
      name: 'María',
      phone: '300',
      email: null,
    });
    prisma.client.update.mockResolvedValue({
      id: 5,
      companyId: 1,
      name: 'María',
      phone: '300',
    });

    await service.update(1, 5, { name: 'María', email: 'maria@correo.com' });

    expect(prisma.clientTimelineEvent.create).toHaveBeenCalledWith({
      data: {
        clientId: 5,
        type: ClientTimelineEventType.UPDATED,
        description: 'Datos actualizados: correo.',
      },
    });
  });

  it('update no hace nada si ningún campo enviado cambia el valor actual', async () => {
    prisma.client.findFirst.mockResolvedValue({
      id: 5,
      companyId: 1,
      name: 'María',
      phone: '300',
    });

    const result = await service.update(1, 5, { name: 'María' });

    expect(prisma.client.update).not.toHaveBeenCalled();
    expect(prisma.clientTimelineEvent.create).not.toHaveBeenCalled();
    expect(result.name).toBe('María');
  });

  it('getTimeline ordena los eventos del más reciente al más antiguo', async () => {
    prisma.client.findFirst.mockResolvedValue({ id: 5, companyId: 1 });
    prisma.clientTimelineEvent.findMany.mockResolvedValue([]);

    await service.getTimeline(1, 5);

    expect(prisma.clientTimelineEvent.findMany).toHaveBeenCalledWith({
      where: { clientId: 5 },
      orderBy: { createdAt: 'desc' },
    });
  });
});
