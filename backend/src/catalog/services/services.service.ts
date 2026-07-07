import { Injectable, NotFoundException } from '@nestjs/common';
import { Service } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: number, dto: CreateServiceDto): Promise<Service> {
    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.assertCategoryBelongsToCompany(companyId, dto.categoryId);
    }

    return this.prisma.service.create({
      data: { companyId, ...dto },
    });
  }

  findAll(companyId: number): Promise<Service[]> {
    return this.prisma.service.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      include: { category: true },
    });
  }

  /**
   * Busca por `id` **y** `companyId` a la vez — nunca por `id` solo. Es la
   * barrera de aislamiento entre empresas para este recurso.
   */
  async findByIdOrThrow(companyId: number, id: number): Promise<Service> {
    const service = await this.prisma.service.findFirst({
      where: { id, companyId },
      include: { category: true },
    });

    if (!service) {
      throw new NotFoundException(`Servicio ${id} no encontrado`);
    }

    return service;
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateServiceDto,
  ): Promise<Service> {
    await this.findByIdOrThrow(companyId, id);

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      await this.assertCategoryBelongsToCompany(companyId, dto.categoryId);
    }

    return this.prisma.service.update({ where: { id }, data: dto });
  }

  /** Evita que un Business Admin asigne a un servicio una categoría de otra empresa. */
  private async assertCategoryBelongsToCompany(
    companyId: number,
    categoryId: number,
  ): Promise<void> {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id: categoryId, companyId },
    });

    if (!category) {
      throw new NotFoundException(`Categoría ${categoryId} no encontrada`);
    }
  }
}
