import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  Professional,
  ProfessionalBlock,
  Role,
} from '../../../generated/prisma';
import { CurrentCompanyId } from '../../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../../shared/tenancy/tenant.guard';
import { Roles } from '../../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../people/auth/guards/roles.guard';
import { CreateProfessionalBlockDto } from './dto/create-professional-block.dto';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { SetProfessionalScheduleDto } from './dto/set-professional-schedule.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { ProfessionalsService } from './professionals.service';

@ApiTags('Scheduling / Professionals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN)
@Controller('scheduling/professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @Body() dto: CreateProfessionalDto,
  ): Promise<Professional> {
    return this.professionalsService.create(companyId, dto);
  }

  /**
   * Lectura abierta a Supervisor/Recepcionista-Cajero: la Agenda (accesible a
   * esos roles) necesita listar profesionales para su formulario de citas,
   * aunque crear/editar profesionales siga siendo exclusivo de Business Admin.
   */
  @Get()
  @Roles(Role.BUSINESS_ADMIN, Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER)
  findAll(@CurrentCompanyId() companyId: number): Promise<Professional[]> {
    return this.professionalsService.findAll(companyId);
  }

  @Get(':id')
  @Roles(Role.BUSINESS_ADMIN, Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER)
  findOne(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.professionalsService.findByIdOrThrow(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProfessionalDto,
  ): Promise<Professional> {
    return this.professionalsService.update(companyId, id, dto);
  }

  @Post(':id/schedule')
  setSchedule(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetProfessionalScheduleDto,
  ) {
    return this.professionalsService.setSchedule(companyId, id, dto.schedule);
  }

  @Post(':id/blocks')
  createBlock(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateProfessionalBlockDto,
  ): Promise<ProfessionalBlock> {
    return this.professionalsService.createBlock(companyId, id, dto);
  }

  @Delete(':id/blocks/:blockId')
  @HttpCode(204)
  removeBlock(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Param('blockId', ParseIntPipe) blockId: number,
  ): Promise<void> {
    return this.professionalsService.removeBlock(companyId, id, blockId);
  }
}
