import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Appointment,
  AppointmentStatus,
  Prisma,
  ProfessionalBlockType,
  ResourceType,
} from '../../../generated/prisma';
import { AuthenticatedUser } from '../../people/auth/auth-user.interface';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { ScheduleExceptionsService } from '../schedule-exceptions/schedule-exceptions.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

/** Estados que de verdad ocupan la agenda de un profesional/recurso. */
const BLOCKING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.WAITING,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
];

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  WAITING: 'En espera',
  IN_PROGRESS: 'En atención',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  RESCHEDULED: 'Reagendada',
};

const BLOCK_TYPE_LABELS: Record<ProfessionalBlockType, string> = {
  LUNCH: 'almuerzo',
  TRAINING: 'capacitación',
  VACATION: 'vacaciones',
  OTHER: 'bloqueo',
};

function toHHMM(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

interface AvailabilityCheck {
  companyId: number;
  branchId: number;
  professionalId: number;
  startAt: Date;
  endAt: Date;
  blockedUntil: Date;
  excludeAppointmentId?: number;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleExceptionsService: ScheduleExceptionsService,
    private readonly waitlistService: WaitlistService,
  ) {}

  async create(
    companyId: number,
    actor: AuthenticatedUser,
    dto: CreateAppointmentDto,
  ): Promise<Appointment> {
    const [branch, service, company] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: dto.branchId, companyId } }),
      this.prisma.service.findFirst({
        where: { id: dto.serviceId, companyId },
      }),
      this.prisma.company.findUnique({ where: { id: companyId } }),
    ]);
    if (!branch)
      throw new NotFoundException(`Sucursal ${dto.branchId} no encontrada`);
    if (!service)
      throw new NotFoundException(`Servicio ${dto.serviceId} no encontrado`);

    if (!dto.clientId && !company?.allowBookingWithoutClient) {
      throw new BadRequestException(
        'Esta empresa exige seleccionar un cliente para agendar',
      );
    }
    if (dto.clientId) {
      const client = await this.prisma.client.findFirst({
        where: { id: dto.clientId, companyId },
      });
      if (!client)
        throw new NotFoundException(`Cliente ${dto.clientId} no encontrado`);
    }

    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, companyId },
    });
    if (!professional)
      throw new NotFoundException(
        `Profesional ${dto.professionalId} no encontrado`,
      );

    if (service.requiresTwoProfessionals && !dto.secondProfessionalId) {
      throw new BadRequestException(
        'Este servicio requiere un segundo profesional',
      );
    }
    if (dto.secondProfessionalId) {
      if (dto.secondProfessionalId === dto.professionalId) {
        throw new BadRequestException(
          'El segundo profesional debe ser distinto al principal',
        );
      }
      const second = await this.prisma.professional.findFirst({
        where: { id: dto.secondProfessionalId, companyId },
      });
      if (!second) {
        throw new NotFoundException(
          `Profesional ${dto.secondProfessionalId} no encontrado`,
        );
      }
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(
      startAt.getTime() + service.durationMinutes * 60_000,
    );
    const blockedUntil = new Date(
      endAt.getTime() + service.bufferMinutes * 60_000,
    );

    await this.assertAvailability({
      companyId,
      branchId: dto.branchId,
      professionalId: dto.professionalId,
      startAt,
      endAt,
      blockedUntil,
    });
    if (dto.secondProfessionalId) {
      await this.assertAvailability({
        companyId,
        branchId: dto.branchId,
        professionalId: dto.secondProfessionalId,
        startAt,
        endAt,
        blockedUntil,
      });
    }

    let resourceId: number | null = null;
    if (service.resourceType) {
      resourceId = await this.resolveResource(
        companyId,
        dto.branchId,
        service.resourceType,
        dto.resourceId,
        startAt,
        blockedUntil,
      );
    }

    const status = company?.requireAppointmentApproval
      ? AppointmentStatus.PENDING
      : AppointmentStatus.CONFIRMED;

    return this.prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          companyId,
          branchId: dto.branchId,
          clientId: dto.clientId,
          serviceId: dto.serviceId,
          professionalId: dto.professionalId,
          secondProfessionalId: dto.secondProfessionalId,
          resourceId,
          startAt,
          endAt,
          blockedUntil,
          status,
          notes: dto.notes,
        },
      });
      await tx.appointmentHistoryEvent.create({
        data: {
          appointmentId: appointment.id,
          description: `Cita creada por ${actor.email}.`,
        },
      });
      return appointment;
    });
  }

  findAll(
    companyId: number,
    filters: {
      branchId?: number;
      professionalId?: number;
      clientId?: number;
      status?: AppointmentStatus;
    },
  ) {
    const where: Prisma.AppointmentWhereInput = { companyId, ...filters };

    return this.prisma.appointment.findMany({
      where,
      orderBy: { startAt: 'asc' },
      include: {
        client: true,
        service: true,
        professional: true,
        secondProfessional: true,
        resource: true,
      },
    });
  }

  /**
   * Busca por `id` **y** `companyId` a la vez — nunca por `id` solo. Es la
   * barrera de aislamiento entre empresas para este recurso.
   */
  async findByIdOrThrow(companyId: number, id: number) {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id, companyId },
      include: {
        client: true,
        service: true,
        professional: true,
        secondProfessional: true,
        resource: true,
        historyEvents: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Cita ${id} no encontrada`);
    }

    return appointment;
  }

  async update(
    companyId: number,
    actor: AuthenticatedUser,
    id: number,
    dto: UpdateAppointmentDto,
  ): Promise<Appointment> {
    const current = await this.findByIdOrThrow(companyId, id);

    if (
      dto.serviceId !== undefined &&
      dto.serviceId !== current.serviceId &&
      current.status === AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        'No se puede cambiar el servicio de una cita ya finalizada',
      );
    }

    const changingProfessional =
      (dto.professionalId !== undefined &&
        dto.professionalId !== current.professionalId) ||
      (dto.secondProfessionalId !== undefined &&
        dto.secondProfessionalId !== current.secondProfessionalId);
    if (changingProfessional) {
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });
      if (!company?.allowProfessionalChangeOnAppointment) {
        throw new BadRequestException(
          'Esta empresa no permite cambiar el profesional de una cita',
        );
      }
    }

    const effectiveService = dto.serviceId
      ? await this.prisma.service.findFirst({
          where: { id: dto.serviceId, companyId },
        })
      : await this.prisma.service.findFirst({
          where: { id: current.serviceId },
        });
    if (dto.serviceId && !effectiveService) {
      throw new NotFoundException(`Servicio ${dto.serviceId} no encontrado`);
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : current.startAt;
    const endAt = new Date(
      startAt.getTime() + effectiveService!.durationMinutes * 60_000,
    );
    const blockedUntil = new Date(
      endAt.getTime() + effectiveService!.bufferMinutes * 60_000,
    );

    const professionalId = dto.professionalId ?? current.professionalId;
    const secondProfessionalId =
      dto.secondProfessionalId !== undefined
        ? dto.secondProfessionalId
        : current.secondProfessionalId;

    const needsAvailabilityRecheck =
      dto.startAt !== undefined ||
      dto.professionalId !== undefined ||
      dto.secondProfessionalId !== undefined ||
      dto.serviceId !== undefined;

    if (
      needsAvailabilityRecheck &&
      current.status !== AppointmentStatus.CANCELLED
    ) {
      await this.assertAvailability({
        companyId,
        branchId: current.branchId,
        professionalId,
        startAt,
        endAt,
        blockedUntil,
        excludeAppointmentId: id,
      });
      if (secondProfessionalId) {
        await this.assertAvailability({
          companyId,
          branchId: current.branchId,
          professionalId: secondProfessionalId,
          startAt,
          endAt,
          blockedUntil,
          excludeAppointmentId: id,
        });
      }
    }

    let resourceId: number | null | undefined =
      dto.resourceId !== undefined ? dto.resourceId : current.resourceId;
    if (effectiveService!.resourceType && needsAvailabilityRecheck) {
      resourceId = await this.resolveResource(
        companyId,
        current.branchId,
        effectiveService!.resourceType,
        dto.resourceId ?? current.resourceId ?? undefined,
        startAt,
        blockedUntil,
        id,
      );
    }

    const changes = this.describeChanges(current, dto);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.update({
        where: { id },
        data: {
          status: dto.status,
          professionalId: dto.professionalId,
          secondProfessionalId: dto.secondProfessionalId,
          serviceId: dto.serviceId,
          resourceId: resourceId ?? undefined,
          startAt: dto.startAt || dto.serviceId ? startAt : undefined,
          endAt: dto.startAt || dto.serviceId ? endAt : undefined,
          blockedUntil: dto.startAt || dto.serviceId ? blockedUntil : undefined,
          notes: dto.notes,
          clientId: dto.clientId,
        },
      });

      if (changes.length > 0) {
        await tx.appointmentHistoryEvent.create({
          data: {
            appointmentId: id,
            description: `${actor.email} actualizó: ${changes.join(', ')}.`,
          },
        });
      }

      if (dto.status === AppointmentStatus.NO_SHOW && current.clientId) {
        await tx.client.update({
          where: { id: current.clientId },
          data: { noShowCount: { increment: 1 } },
        });
      }

      return result;
    });

    if (dto.status === AppointmentStatus.CANCELLED) {
      await this.waitlistService.offerNextMatch(
        companyId,
        updated.branchId,
        updated.serviceId,
        updated.professionalId,
      );
    }

    return updated;
  }

  private describeChanges(
    current: Awaited<ReturnType<AppointmentsService['findByIdOrThrow']>>,
    dto: UpdateAppointmentDto,
  ): string[] {
    const changes: string[] = [];

    if (dto.status !== undefined && dto.status !== current.status) {
      changes.push(
        `estado de "${STATUS_LABELS[current.status]}" a "${STATUS_LABELS[dto.status]}"`,
      );
    }
    if (
      dto.professionalId !== undefined &&
      dto.professionalId !== current.professionalId
    ) {
      changes.push('profesional');
    }
    if (
      dto.secondProfessionalId !== undefined &&
      dto.secondProfessionalId !== current.secondProfessionalId
    ) {
      changes.push('segundo profesional');
    }
    if (dto.serviceId !== undefined && dto.serviceId !== current.serviceId) {
      changes.push('servicio');
    }
    if (dto.resourceId !== undefined && dto.resourceId !== current.resourceId) {
      changes.push('recurso');
    }
    if (
      dto.startAt !== undefined &&
      new Date(dto.startAt).getTime() !== current.startAt.getTime()
    ) {
      changes.push('horario');
    }
    if (dto.clientId !== undefined && dto.clientId !== current.clientId) {
      changes.push('cliente');
    }
    if (dto.notes !== undefined && dto.notes !== current.notes) {
      changes.push('notas');
    }

    return changes;
  }

  private async assertAvailability(check: AvailabilityCheck): Promise<void> {
    const {
      companyId,
      branchId,
      professionalId,
      startAt,
      endAt,
      blockedUntil,
      excludeAppointmentId,
    } = check;

    const isHoliday = await this.scheduleExceptionsService.isDateBlocked(
      companyId,
      branchId,
      startAt,
    );
    if (isHoliday) {
      throw new BadRequestException(
        'La sucursal está cerrada ese día (festivo/excepción)',
      );
    }

    const dayOfWeek = startAt.getUTCDay();
    const startTime = toHHMM(startAt);
    const endTime = toHHMM(endAt);

    const schedules = await this.prisma.professionalSchedule.findMany({
      where: { professionalId, branchId, dayOfWeek },
    });
    const isWithinSchedule = schedules.some(
      (schedule) =>
        schedule.startsAt <= startTime && schedule.endsAt >= endTime,
    );
    if (!isWithinSchedule) {
      throw new BadRequestException(
        'El profesional no tiene horario disponible en esa sucursal/día/hora',
      );
    }

    const blocks = await this.prisma.professionalBlock.findMany({
      where: {
        professionalId,
        startAt: { lt: blockedUntil },
        endAt: { gt: startAt },
      },
    });
    if (blocks.length > 0) {
      throw new BadRequestException(
        `El profesional tiene un bloqueo (${BLOCK_TYPE_LABELS[blocks[0].type]}) en ese horario`,
      );
    }

    const overlapping = await this.prisma.appointment.count({
      where: {
        OR: [{ professionalId }, { secondProfessionalId: professionalId }],
        status: { in: BLOCKING_STATUSES },
        startAt: { lt: blockedUntil },
        blockedUntil: { gt: startAt },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
    });
    if (overlapping > 0) {
      throw new BadRequestException(
        'El profesional ya tiene otra cita en ese horario',
      );
    }
  }

  private async resolveResource(
    companyId: number,
    branchId: number,
    type: ResourceType,
    explicitResourceId: number | undefined,
    startAt: Date,
    blockedUntil: Date,
    excludeAppointmentId?: number,
  ): Promise<number> {
    if (explicitResourceId) {
      const resource = await this.prisma.resource.findFirst({
        where: {
          id: explicitResourceId,
          companyId,
          branchId,
          type,
          isActive: true,
        },
      });
      if (!resource) {
        throw new NotFoundException(
          'El recurso indicado no existe o no es del tipo requerido por el servicio',
        );
      }
      const busy = await this.isResourceBusy(
        explicitResourceId,
        startAt,
        blockedUntil,
        excludeAppointmentId,
      );
      if (busy) {
        throw new BadRequestException(
          'El recurso seleccionado ya está ocupado en ese horario',
        );
      }
      return explicitResourceId;
    }

    const candidates = await this.prisma.resource.findMany({
      where: { companyId, branchId, type, isActive: true },
    });
    for (const candidate of candidates) {
      const busy = await this.isResourceBusy(
        candidate.id,
        startAt,
        blockedUntil,
        excludeAppointmentId,
      );
      if (!busy) {
        return candidate.id;
      }
    }

    throw new BadRequestException(
      `No hay un recurso de tipo ${type} disponible en ese horario`,
    );
  }

  private async isResourceBusy(
    resourceId: number,
    startAt: Date,
    blockedUntil: Date,
    excludeAppointmentId?: number,
  ): Promise<boolean> {
    const count = await this.prisma.appointment.count({
      where: {
        resourceId,
        status: { in: BLOCKING_STATUSES },
        startAt: { lt: blockedUntil },
        blockedUntil: { gt: startAt },
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
    });
    return count > 0;
  }
}
