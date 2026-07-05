import { Injectable, NotFoundException } from '@nestjs/common';
import { Branch, Prisma } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { OpeningHourDto } from './dto/set-branch-schedule.dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  create(companyId: number, dto: CreateBranchDto): Promise<Branch> {
    return this.prisma.branch.create({ data: { companyId, ...dto } });
  }

  findAll(companyId: number): Promise<Branch[]> {
    return this.prisma.branch.findMany({
      where: { companyId },
      orderBy: { id: 'asc' },
    });
  }

  /**
   * Busca por `id` **y** `companyId` a la vez — nunca por `id` solo. Esta es
   * la barrera de aislamiento entre empresas para este recurso: garantiza
   * que un Business Admin jamás pueda leer o modificar una sucursal que no
   * sea de su propia empresa, aunque adivine el id de otra.
   */
  async findByIdOrThrow(companyId: number, id: number): Promise<Branch> {
    const branch = await this.prisma.branch.findFirst({
      where: { id, companyId },
    });

    if (!branch) {
      throw new NotFoundException(`Sucursal ${id} no encontrada`);
    }

    return branch;
  }

  async setSchedule(
    companyId: number,
    id: number,
    schedule: OpeningHourDto[],
  ): Promise<Branch> {
    await this.findByIdOrThrow(companyId, id);

    return this.prisma.branch.update({
      where: { id },
      data: { openingHours: schedule as unknown as Prisma.InputJsonValue },
    });
  }
}
