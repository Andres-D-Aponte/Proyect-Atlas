import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Professional,
  ProfessionalBlock,
  ProfessionalSchedule,
  Role,
} from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateProfessionalBlockDto } from './dto/create-professional-block.dto';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { ProfessionalScheduleRowDto } from './dto/set-professional-schedule.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';

type ProfessionalWithDetails = Professional & {
  schedules: ProfessionalSchedule[];
  blocks: ProfessionalBlock[];
};

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: number,
    dto: CreateProfessionalDto,
  ): Promise<Professional> {
    if (dto.userId !== undefined) {
      await this.assertUserIsAssignable(companyId, dto.userId);
    }

    return this.prisma.professional.create({
      data: { companyId, name: dto.name, userId: dto.userId },
    });
  }

  findAll(companyId: number): Promise<ProfessionalWithDetails[]> {
    return this.prisma.professional.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      include: {
        schedules: { orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }] },
        blocks: { orderBy: { startAt: 'desc' } },
      },
    });
  }

  /**
   * Busca por `id` **y** `companyId` a la vez — nunca por `id` solo. Es la
   * barrera de aislamiento entre empresas para este recurso.
   */
  async findByIdOrThrow(
    companyId: number,
    id: number,
  ): Promise<ProfessionalWithDetails> {
    const professional = await this.prisma.professional.findFirst({
      where: { id, companyId },
      include: {
        schedules: { orderBy: [{ dayOfWeek: 'asc' }, { startsAt: 'asc' }] },
        blocks: { orderBy: { startAt: 'desc' } },
      },
    });

    if (!professional) {
      throw new NotFoundException(`Profesional ${id} no encontrado`);
    }

    return professional;
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateProfessionalDto,
  ): Promise<Professional> {
    await this.findByIdOrThrow(companyId, id);

    if (dto.userId !== undefined && dto.userId !== null) {
      await this.assertUserIsAssignable(companyId, dto.userId, id);
    }

    return this.prisma.professional.update({ where: { id }, data: dto });
  }

  async setSchedule(
    companyId: number,
    id: number,
    schedule: ProfessionalScheduleRowDto[],
  ): Promise<ProfessionalWithDetails> {
    await this.findByIdOrThrow(companyId, id);
    await this.assertBranchesBelongToCompany(
      companyId,
      schedule.map((row) => row.branchId),
    );

    await this.prisma.$transaction([
      this.prisma.professionalSchedule.deleteMany({
        where: { professionalId: id },
      }),
      this.prisma.professionalSchedule.createMany({
        data: schedule.map((row) => ({ ...row, professionalId: id })),
      }),
    ]);

    return this.findByIdOrThrow(companyId, id);
  }

  async createBlock(
    companyId: number,
    id: number,
    dto: CreateProfessionalBlockDto,
  ): Promise<ProfessionalBlock> {
    await this.findByIdOrThrow(companyId, id);

    if (new Date(dto.endAt) <= new Date(dto.startAt)) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    return this.prisma.professionalBlock.create({
      data: {
        professionalId: id,
        type: dto.type,
        startAt: dto.startAt,
        endAt: dto.endAt,
        notes: dto.notes,
      },
    });
  }

  async removeBlock(
    companyId: number,
    id: number,
    blockId: number,
  ): Promise<void> {
    await this.findByIdOrThrow(companyId, id);

    const block = await this.prisma.professionalBlock.findFirst({
      where: { id: blockId, professionalId: id },
    });
    if (!block) {
      throw new NotFoundException(`Bloqueo ${blockId} no encontrado`);
    }

    await this.prisma.professionalBlock.delete({ where: { id: blockId } });
  }

  private async assertBranchesBelongToCompany(
    companyId: number,
    branchIds: number[],
  ): Promise<void> {
    const uniqueIds = Array.from(new Set(branchIds));
    if (uniqueIds.length === 0) {
      return;
    }

    const count = await this.prisma.branch.count({
      where: { id: { in: uniqueIds }, companyId },
    });
    if (count !== uniqueIds.length) {
      throw new NotFoundException(
        'Una de las sucursales del horario no pertenece a tu empresa',
      );
    }
  }

  private async assertUserIsAssignable(
    companyId: number,
    userId: number,
    excludeProfessionalId?: number,
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId, role: Role.PROFESSIONAL },
    });
    if (!user) {
      throw new NotFoundException(
        `Usuario ${userId} no encontrado o no tiene rol Profesional en tu empresa`,
      );
    }

    const alreadyLinked = await this.prisma.professional.findUnique({
      where: { userId },
    });
    if (alreadyLinked && alreadyLinked.id !== excludeProfessionalId) {
      throw new BadRequestException(
        'Ese usuario ya está vinculado a otro profesional',
      );
    }
  }
}
