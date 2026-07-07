import { Injectable, NotFoundException } from '@nestjs/common';
import { ScheduleException } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';

@Injectable()
export class ScheduleExceptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: number,
    dto: CreateScheduleExceptionDto,
  ): Promise<ScheduleException> {
    if (dto.branchId !== undefined) {
      const branch = await this.prisma.branch.findFirst({
        where: { id: dto.branchId, companyId },
      });
      if (!branch) {
        throw new NotFoundException(`Sucursal ${dto.branchId} no encontrada`);
      }
    }

    return this.prisma.scheduleException.create({
      data: {
        companyId,
        branchId: dto.branchId,
        date: new Date(dto.date),
        reason: dto.reason,
      },
    });
  }

  findAll(companyId: number): Promise<ScheduleException[]> {
    return this.prisma.scheduleException.findMany({
      where: { companyId },
      orderBy: { date: 'asc' },
    });
  }

  async remove(companyId: number, id: number): Promise<void> {
    const exception = await this.prisma.scheduleException.findFirst({
      where: { id, companyId },
    });
    if (!exception) {
      throw new NotFoundException(`Excepción ${id} no encontrada`);
    }

    await this.prisma.scheduleException.delete({ where: { id } });
  }

  /** Usado por ApplicationsService para el chequeo de disponibilidad. */
  async isDateBlocked(
    companyId: number,
    branchId: number,
    date: Date,
  ): Promise<boolean> {
    const dayStart = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const count = await this.prisma.scheduleException.count({
      where: {
        companyId,
        date: dayStart,
        OR: [{ branchId: null }, { branchId }],
      },
    });
    return count > 0;
  }
}
