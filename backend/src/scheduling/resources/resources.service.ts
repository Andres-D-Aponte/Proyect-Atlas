import { Injectable, NotFoundException } from '@nestjs/common';
import { Resource } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: number, dto: CreateResourceDto): Promise<Resource> {
    await this.assertBranchBelongsToCompany(companyId, dto.branchId);

    return this.prisma.resource.create({
      data: {
        companyId,
        branchId: dto.branchId,
        type: dto.type,
        name: dto.name,
      },
    });
  }

  findAll(companyId: number, branchId?: number): Promise<Resource[]> {
    return this.prisma.resource.findMany({
      where: { companyId, ...(branchId ? { branchId } : {}) },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Busca por `id` **y** `companyId` a la vez — nunca por `id` solo. Es la
   * barrera de aislamiento entre empresas para este recurso.
   */
  async findByIdOrThrow(companyId: number, id: number): Promise<Resource> {
    const resource = await this.prisma.resource.findFirst({
      where: { id, companyId },
    });
    if (!resource) {
      throw new NotFoundException(`Recurso ${id} no encontrado`);
    }
    return resource;
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateResourceDto,
  ): Promise<Resource> {
    await this.findByIdOrThrow(companyId, id);
    return this.prisma.resource.update({ where: { id }, data: dto });
  }

  private async assertBranchBelongsToCompany(
    companyId: number,
    branchId: number,
  ): Promise<void> {
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, companyId },
    });
    if (!branch) {
      throw new NotFoundException(`Sucursal ${branchId} no encontrada`);
    }
  }
}
