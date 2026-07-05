import { Injectable, NotFoundException } from '@nestjs/common';
import { Plan } from '../../../generated/prisma';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePlanDto): Promise<Plan> {
    return this.prisma.plan.create({
      data: { ...dto, enabledModules: dto.enabledModules ?? [] },
    });
  }

  findAll(): Promise<Plan[]> {
    return this.prisma.plan.findMany({ orderBy: { id: 'asc' } });
  }

  async findByIdOrThrow(id: number): Promise<Plan> {
    const plan = await this.prisma.plan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException(`Plan ${id} no encontrado`);
    }

    return plan;
  }
}
