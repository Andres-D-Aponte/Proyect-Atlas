import { Injectable, NotFoundException } from '@nestjs/common';
import {
  License,
  LicenseExpirationBehavior,
  Prisma,
} from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { AssignLicenseDto } from './dto/assign-license.dto';

@Injectable()
export class LicensesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea o reemplaza la licencia de una empresa (relación 1:1). Se apoya en
   * las llaves foráneas de `companyId`/`planId` para validar existencia en
   * un solo viaje a la base de datos, en vez de consultar Company/Plan por
   * separado — evita acoplar este módulo a Companies/Plans.
   */
  async assign(companyId: number, dto: AssignLicenseDto): Promise<License> {
    const data = {
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      endDate: new Date(dto.endDate),
      expirationBehavior:
        dto.expirationBehavior ?? LicenseExpirationBehavior.IMMEDIATE_READ_ONLY,
    };

    try {
      return await this.prisma.license.upsert({
        where: { companyId },
        create: { companyId, ...data },
        update: data,
      });
    } catch (error) {
      throw this.translateForeignKeyError(error, companyId, dto.planId);
    }
  }

  async findByCompanyIdOrThrow(companyId: number): Promise<License> {
    const license = await this.prisma.license.findUnique({
      where: { companyId },
      include: { plan: true },
    });

    if (!license) {
      throw new NotFoundException(
        `La empresa ${companyId} no tiene una licencia asignada`,
      );
    }

    return license;
  }

  private translateForeignKeyError(
    error: unknown,
    companyId: number,
    planId: number,
  ): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      const field =
        typeof error.meta?.field_name === 'string' ? error.meta.field_name : '';

      if (field.includes('companyId')) {
        return new NotFoundException(`Empresa ${companyId} no encontrada`);
      }
      if (field.includes('planId')) {
        return new NotFoundException(`Plan ${planId} no encontrado`);
      }
    }

    return error instanceof Error
      ? error
      : new Error('Error inesperado asignando la licencia');
  }
}
