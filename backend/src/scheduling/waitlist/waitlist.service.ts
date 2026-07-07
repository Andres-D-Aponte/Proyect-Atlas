import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Waitlist, WaitlistStatus } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';

@Injectable()
export class WaitlistService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: number,
    dto: CreateWaitlistEntryDto,
  ): Promise<Waitlist> {
    const [branch, client, service] = await Promise.all([
      this.prisma.branch.findFirst({ where: { id: dto.branchId, companyId } }),
      this.prisma.client.findFirst({ where: { id: dto.clientId, companyId } }),
      this.prisma.service.findFirst({
        where: { id: dto.serviceId, companyId },
      }),
    ]);
    if (!branch)
      throw new NotFoundException(`Sucursal ${dto.branchId} no encontrada`);
    if (!client)
      throw new NotFoundException(`Cliente ${dto.clientId} no encontrado`);
    if (!service)
      throw new NotFoundException(`Servicio ${dto.serviceId} no encontrado`);

    if (dto.professionalId !== undefined) {
      const professional = await this.prisma.professional.findFirst({
        where: { id: dto.professionalId, companyId },
      });
      if (!professional) {
        throw new NotFoundException(
          `Profesional ${dto.professionalId} no encontrado`,
        );
      }
    }

    return this.prisma.waitlist.create({
      data: {
        companyId,
        branchId: dto.branchId,
        clientId: dto.clientId,
        serviceId: dto.serviceId,
        professionalId: dto.professionalId,
      },
    });
  }

  findAll(companyId: number): Promise<Waitlist[]> {
    return this.prisma.waitlist.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
      include: { client: true, service: true, professional: true },
    });
  }

  async cancel(companyId: number, id: number): Promise<Waitlist> {
    const entry = await this.prisma.waitlist.findFirst({
      where: { id, companyId },
    });
    if (!entry) {
      throw new NotFoundException(
        `Entrada de lista de espera ${id} no encontrada`,
      );
    }
    if (entry.status === WaitlistStatus.CONVERTED) {
      throw new BadRequestException(
        'No se puede cancelar una entrada ya convertida en cita',
      );
    }

    return this.prisma.waitlist.update({
      where: { id },
      data: { status: WaitlistStatus.CANCELLED },
    });
  }

  /**
   * Se llama desde AppointmentsService cuando se cancela una cita (ver PRD
   * sección 4.2, "Lista de espera"). Ofrece el cupo al primero en la lista
   * que sea compatible (mismo servicio/sucursal, mismo profesional si la
   * entrada lo pedía específico). No envía ninguna notificación real al
   * cliente — eso requiere un canal (WhatsApp, Etapa 11) que no existe
   * todavía; la oferta queda visible para que el staff lo contacte.
   */
  async offerNextMatch(
    companyId: number,
    branchId: number,
    serviceId: number,
    professionalId: number,
  ): Promise<Waitlist | null> {
    const candidate = await this.prisma.waitlist.findFirst({
      where: {
        companyId,
        branchId,
        serviceId,
        status: WaitlistStatus.WAITING,
        OR: [{ professionalId: null }, { professionalId }],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!candidate) {
      return null;
    }

    return this.prisma.waitlist.update({
      where: { id: candidate.id },
      data: { status: WaitlistStatus.OFFERED, offeredAt: new Date() },
    });
  }
}
