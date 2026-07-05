import { Injectable, NotFoundException } from '@nestjs/common';
import { Company } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateCompanySettingsDto } from './dto/update-company-settings.dto';

@Injectable()
export class CompanySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrThrow(companyId: number): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException(`Empresa ${companyId} no encontrada`);
    }

    return company;
  }

  async update(
    companyId: number,
    dto: UpdateCompanySettingsDto,
  ): Promise<Company> {
    await this.findOrThrow(companyId);

    return this.prisma.company.update({ where: { id: companyId }, data: dto });
  }
}
