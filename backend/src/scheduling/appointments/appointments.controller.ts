import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AppointmentStatus, Role } from '../../../generated/prisma';
import type { AuthenticatedUser } from '../../people/auth/auth-user.interface';
import { CurrentUser } from '../../people/auth/decorators/current-user.decorator';
import { CurrentCompanyId } from '../../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../../shared/tenancy/tenant.guard';
import { Roles } from '../../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../people/auth/guards/roles.guard';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('Scheduling / Appointments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN, Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER)
@Controller('scheduling/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(companyId, actor, dto);
  }

  @Get()
  findAll(
    @CurrentCompanyId() companyId: number,
    @Query('branchId') branchId?: string,
    @Query('professionalId') professionalId?: string,
    @Query('clientId') clientId?: string,
    @Query('status') status?: AppointmentStatus,
  ) {
    return this.appointmentsService.findAll(companyId, {
      branchId: branchId ? Number(branchId) : undefined,
      professionalId: professionalId ? Number(professionalId) : undefined,
      clientId: clientId ? Number(clientId) : undefined,
      status,
    });
  }

  @Get(':id')
  findOne(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.appointmentsService.findByIdOrThrow(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentCompanyId() companyId: number,
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointmentsService.update(companyId, actor, id, dto);
  }
}
