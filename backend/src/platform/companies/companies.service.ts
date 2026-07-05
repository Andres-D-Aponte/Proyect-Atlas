import { Injectable, NotFoundException } from '@nestjs/common';
import { Company } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateCompanyDto): Promise<Company> {
    return this.prisma.company.create({ data: dto });
  }

  findAll(): Promise<Company[]> {
    return this.prisma.company.findMany({
      orderBy: { id: 'asc' },
      include: { license: { include: { plan: true } } },
    });
  }

  async findByIdOrThrow(id: number): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { license: { include: { plan: true } } },
    });

    if (!company) {
      throw new NotFoundException(`Empresa ${id} no encontrada`);
    }

    return company;
  }
}
