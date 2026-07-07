import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Branch, Role } from '../../../generated/prisma';
import { CurrentCompanyId } from '../../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../../shared/tenancy/tenant.guard';
import { Roles } from '../../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../people/auth/guards/roles.guard';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { SetBranchScheduleDto } from './dto/set-branch-schedule.dto';

@ApiTags('Settings / Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN)
@Controller('settings/branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @Body() dto: CreateBranchDto,
  ): Promise<Branch> {
    return this.branchesService.create(companyId, dto);
  }

  /**
   * Lectura abierta a Supervisor/Recepcionista-Cajero: la Agenda (accesible a
   * esos roles) necesita listar sucursales para su formulario de citas, aunque
   * crear/editar sucursales siga siendo exclusivo de Business Admin.
   */
  @Get()
  @Roles(Role.BUSINESS_ADMIN, Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER)
  findAll(@CurrentCompanyId() companyId: number): Promise<Branch[]> {
    return this.branchesService.findAll(companyId);
  }

  @Get(':id')
  @Roles(Role.BUSINESS_ADMIN, Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER)
  findOne(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Branch> {
    return this.branchesService.findByIdOrThrow(companyId, id);
  }

  @Post(':id/schedule')
  setSchedule(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetBranchScheduleDto,
  ): Promise<Branch> {
    return this.branchesService.setSchedule(companyId, id, dto.schedule);
  }
}
