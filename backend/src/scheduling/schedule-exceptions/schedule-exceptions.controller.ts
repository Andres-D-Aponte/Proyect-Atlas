import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, ScheduleException } from '../../../generated/prisma';
import { CurrentCompanyId } from '../../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../../shared/tenancy/tenant.guard';
import { Roles } from '../../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../people/auth/guards/roles.guard';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { ScheduleExceptionsService } from './schedule-exceptions.service';

@ApiTags('Scheduling / Schedule Exceptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN)
@Controller('scheduling/schedule-exceptions')
export class ScheduleExceptionsController {
  constructor(
    private readonly scheduleExceptionsService: ScheduleExceptionsService,
  ) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @Body() dto: CreateScheduleExceptionDto,
  ): Promise<ScheduleException> {
    return this.scheduleExceptionsService.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentCompanyId() companyId: number): Promise<ScheduleException[]> {
    return this.scheduleExceptionsService.findAll(companyId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.scheduleExceptionsService.remove(companyId, id);
  }
}
