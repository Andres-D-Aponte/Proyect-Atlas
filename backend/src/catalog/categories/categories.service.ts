import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ServiceCategory } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    companyId: number,
    dto: CreateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    try {
      return await this.prisma.serviceCategory.create({
        data: { companyId, name: dto.name },
      });
    } catch (error) {
      throw this.translateUniqueNameError(error, dto.name);
    }
  }

  findAll(companyId: number): Promise<ServiceCategory[]> {
    return this.prisma.serviceCategory.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Busca por `id` **y** `companyId` a la vez — nunca por `id` solo. Es la
   * barrera de aislamiento entre empresas para este recurso.
   */
  async findByIdOrThrow(
    companyId: number,
    id: number,
  ): Promise<ServiceCategory> {
    const category = await this.prisma.serviceCategory.findFirst({
      where: { id, companyId },
    });

    if (!category) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }

    return category;
  }

  async update(
    companyId: number,
    id: number,
    dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    await this.findByIdOrThrow(companyId, id);

    try {
      return await this.prisma.serviceCategory.update({
        where: { id },
        data: { name: dto.name },
      });
    } catch (error) {
      throw this.translateUniqueNameError(error, dto.name);
    }
  }

  async remove(companyId: number, id: number): Promise<void> {
    await this.findByIdOrThrow(companyId, id);
    // Los servicios que usaban esta categoría quedan sin categoría (onDelete: SetNull),
    // no se borran ni se bloquea el borrado de la categoría.
    await this.prisma.serviceCategory.delete({ where: { id } });
  }

  private translateUniqueNameError(error: unknown, name: string): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        `Ya existe una categoría llamada "${name}" en tu empresa`,
      );
    }
    return error;
  }
}
