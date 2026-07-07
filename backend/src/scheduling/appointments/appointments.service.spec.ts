import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus } from '../../../generated/prisma';
import { AuthenticatedUser } from '../../people/auth/auth-user.interface';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ScheduleExceptionsService } from '../schedule-exceptions/schedule-exceptions.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: {
    branch: { findFirst: jest.Mock };
    service: { findFirst: jest.Mock };
    company: { findUnique: jest.Mock };
    client: { findFirst: jest.Mock; update: jest.Mock };
    professional: { findFirst: jest.Mock };
    professionalSchedule: { findMany: jest.Mock };
    professionalBlock: { findMany: jest.Mock };
    appointment: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    resource: { findFirst: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let scheduleExceptions: { isDateBlocked: jest.Mock };
  let waitlist: { offerNextMatch: jest.Mock };

  const actor = { id: 1, email: 'staff@atlas.dev' } as AuthenticatedUser;

  const branch = { id: 1, companyId: 1 };
  const service1 = {
    id: 1,
    companyId: 1,
    durationMinutes: 30,
    bufferMinutes: 10,
    requiresTwoProfessionals: false,
    resourceType: null,
  };
  const professional1 = { id: 1, companyId: 1 };
  const company = {
    id: 1,
    allowBookingWithoutClient: true,
    requireAppointmentApproval: false,
    allowProfessionalChangeOnAppointment: true,
  };

  let txAppointment: { create: jest.Mock; update: jest.Mock };
  let txHistoryEvent: { create: jest.Mock };
  let txClient: { update: jest.Mock };

  beforeEach(async () => {
    txAppointment = { create: jest.fn(), update: jest.fn() };
    txHistoryEvent = { create: jest.fn() };
    txClient = { update: jest.fn() };

    prisma = {
      branch: { findFirst: jest.fn() },
      service: { findFirst: jest.fn() },
      company: { findUnique: jest.fn() },
      client: { findFirst: jest.fn(), update: jest.fn() },
      professional: { findFirst: jest.fn() },
      professionalSchedule: { findMany: jest.fn() },
      professionalBlock: { findMany: jest.fn() },
      appointment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      resource: { findFirst: jest.fn(), findMany: jest.fn() },
      $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
        cb({
          appointment: txAppointment,
          appointmentHistoryEvent: txHistoryEvent,
          client: txClient,
        }),
      ),
    };

    scheduleExceptions = { isDateBlocked: jest.fn().mockResolvedValue(false) };
    waitlist = { offerNextMatch: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ScheduleExceptionsService, useValue: scheduleExceptions },
        { provide: WaitlistService, useValue: waitlist },
      ],
    }).compile();

    service = module.get(AppointmentsService);
  });

  function mockHappyAvailability() {
    prisma.professionalSchedule.findMany.mockResolvedValue([
      { startsAt: '00:00', endsAt: '23:59' },
    ]);
    prisma.professionalBlock.findMany.mockResolvedValue([]);
    prisma.appointment.count.mockResolvedValue(0);
  }

  const baseDto = {
    branchId: 1,
    clientId: 2,
    serviceId: 1,
    professionalId: 1,
    startAt: '2026-08-03T14:00:00.000Z',
  };

  describe('create', () => {
    beforeEach(() => {
      prisma.branch.findFirst.mockResolvedValue(branch);
      prisma.service.findFirst.mockResolvedValue(service1);
      prisma.company.findUnique.mockResolvedValue(company);
      prisma.client.findFirst.mockResolvedValue({ id: 2, companyId: 1 });
      prisma.professional.findFirst.mockResolvedValue(professional1);
      mockHappyAvailability();
      txAppointment.create.mockResolvedValue({
        id: 10,
        status: AppointmentStatus.CONFIRMED,
      });
    });

    it('crea la cita en CONFIRMED cuando la empresa no exige aprobación', async () => {
      const result = await service.create(1, actor, baseDto);

      expect(txAppointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: AppointmentStatus.CONFIRMED }),
      });
      expect(txHistoryEvent.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 10,
          description: 'Cita creada por staff@atlas.dev.',
        },
      });
      expect(result).toEqual({ id: 10, status: AppointmentStatus.CONFIRMED });
    });

    it('crea la cita en PENDING cuando la empresa exige aprobación', async () => {
      prisma.company.findUnique.mockResolvedValue({
        ...company,
        requireAppointmentApproval: true,
      });

      await service.create(1, actor, baseDto);

      expect(txAppointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: AppointmentStatus.PENDING }),
      });
    });

    it('rechaza si no hay cliente y la empresa no permite reservar sin cliente', async () => {
      prisma.company.findUnique.mockResolvedValue({
        ...company,
        allowBookingWithoutClient: false,
      });

      await expect(
        service.create(1, actor, { ...baseDto, clientId: undefined }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(txAppointment.create).not.toHaveBeenCalled();
    });

    it('rechaza si el servicio no pertenece a la empresa', async () => {
      prisma.service.findFirst.mockResolvedValue(null);

      await expect(service.create(1, actor, baseDto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rechaza si el servicio requiere dos profesionales y no se indica el segundo', async () => {
      prisma.service.findFirst.mockResolvedValue({
        ...service1,
        requiresTwoProfessionals: true,
      });

      await expect(service.create(1, actor, baseDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza si el segundo profesional es igual al principal', async () => {
      await expect(
        service.create(1, actor, { ...baseDto, secondProfessionalId: 1 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rechaza si la sucursal está cerrada ese día (festivo/excepción)', async () => {
      scheduleExceptions.isDateBlocked.mockResolvedValue(true);

      await expect(service.create(1, actor, baseDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(txAppointment.create).not.toHaveBeenCalled();
    });

    it('rechaza si el profesional no tiene horario en ese día/hora', async () => {
      prisma.professionalSchedule.findMany.mockResolvedValue([]);

      await expect(service.create(1, actor, baseDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza si el profesional tiene un bloqueo en ese horario', async () => {
      prisma.professionalBlock.findMany.mockResolvedValue([
        { type: 'VACATION' },
      ]);

      await expect(service.create(1, actor, baseDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rechaza si el profesional ya tiene otra cita que se superpone', async () => {
      prisma.appointment.count.mockResolvedValue(1);

      await expect(service.create(1, actor, baseDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('asigna automáticamente un recurso libre cuando el servicio lo requiere', async () => {
      prisma.service.findFirst.mockResolvedValue({
        ...service1,
        resourceType: 'CHAIR',
      });
      prisma.resource.findMany.mockResolvedValue([{ id: 5 }, { id: 6 }]);
      prisma.appointment.count.mockImplementation(
        ({ where }: { where: { resourceId?: number } }) =>
          Promise.resolve(where.resourceId === 5 ? 1 : 0),
      );

      await service.create(1, actor, baseDto);

      expect(txAppointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ resourceId: 6 }),
      });
    });

    it('rechaza si no hay ningún recurso libre del tipo requerido', async () => {
      prisma.service.findFirst.mockResolvedValue({
        ...service1,
        resourceType: 'CHAIR',
      });
      prisma.resource.findMany.mockResolvedValue([{ id: 5 }]);
      prisma.appointment.count.mockImplementation(
        ({ where }: { where: { resourceId?: number } }) =>
          Promise.resolve(where.resourceId === 5 ? 1 : 0),
      );

      await expect(service.create(1, actor, baseDto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const current = {
      id: 10,
      companyId: 1,
      branchId: 1,
      clientId: 2,
      serviceId: 1,
      professionalId: 1,
      secondProfessionalId: null,
      resourceId: null,
      status: AppointmentStatus.CONFIRMED,
      startAt: new Date('2026-08-03T14:00:00.000Z'),
      notes: null,
    };

    beforeEach(() => {
      prisma.appointment.findFirst.mockResolvedValue(current);
      prisma.service.findFirst.mockResolvedValue(service1);
      prisma.company.findUnique.mockResolvedValue(company);
      mockHappyAvailability();
      txAppointment.update.mockResolvedValue({
        ...current,
        status: AppointmentStatus.CONFIRMED,
      });
    });

    it('rechaza cambiar el servicio de una cita ya finalizada', async () => {
      prisma.appointment.findFirst.mockResolvedValue({
        ...current,
        status: AppointmentStatus.COMPLETED,
      });

      await expect(
        service.update(1, actor, 10, { serviceId: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(txAppointment.update).not.toHaveBeenCalled();
    });

    it('rechaza cambiar el profesional si la política de la empresa no lo permite', async () => {
      prisma.company.findUnique.mockResolvedValue({
        ...company,
        allowProfessionalChangeOnAppointment: false,
      });

      await expect(
        service.update(1, actor, 10, { professionalId: 2 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(txAppointment.update).not.toHaveBeenCalled();
    });

    it('permite cambiar el profesional si la política de la empresa lo permite', async () => {
      prisma.professional.findFirst.mockResolvedValue({ id: 2, companyId: 1 });

      await service.update(1, actor, 10, { professionalId: 2 });

      expect(txAppointment.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: expect.objectContaining({ professionalId: 2 }),
      });
    });

    it('incrementa el contador de inasistencias del cliente al marcar NO_SHOW', async () => {
      await service.update(1, actor, 10, { status: AppointmentStatus.NO_SHOW });

      expect(txClient.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { noShowCount: { increment: 1 } },
      });
    });

    it('no incrementa inasistencias si la cita no tenía cliente registrado', async () => {
      prisma.appointment.findFirst.mockResolvedValue({
        ...current,
        clientId: null,
      });

      await service.update(1, actor, 10, { status: AppointmentStatus.NO_SHOW });

      expect(txClient.update).not.toHaveBeenCalled();
    });

    it('ofrece el cupo a la lista de espera al cancelar la cita', async () => {
      txAppointment.update.mockResolvedValue({
        ...current,
        status: AppointmentStatus.CANCELLED,
      });

      await service.update(1, actor, 10, {
        status: AppointmentStatus.CANCELLED,
      });

      expect(waitlist.offerNextMatch).toHaveBeenCalledWith(
        1,
        current.branchId,
        current.serviceId,
        current.professionalId,
      );
    });

    it('no ofrece el cupo a la lista de espera si el nuevo estado no es CANCELLED', async () => {
      await service.update(1, actor, 10, {
        status: AppointmentStatus.IN_PROGRESS,
      });

      expect(waitlist.offerNextMatch).not.toHaveBeenCalled();
    });

    it('registra un evento de historial describiendo el cambio de estado', async () => {
      await service.update(1, actor, 10, {
        status: AppointmentStatus.IN_PROGRESS,
      });

      expect(txHistoryEvent.create).toHaveBeenCalledWith({
        data: {
          appointmentId: 10,
          description:
            'staff@atlas.dev actualizó: estado de "Confirmada" a "En atención".',
        },
      });
    });

    it('no registra evento de historial si no hay cambios relevantes', async () => {
      await service.update(1, actor, 10, { notes: undefined });

      expect(txHistoryEvent.create).not.toHaveBeenCalled();
    });
  });
});
