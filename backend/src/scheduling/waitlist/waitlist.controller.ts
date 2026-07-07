import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, Waitlist } from '../../../generated/prisma';
import { CurrentCompanyId } from '../../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../../shared/tenancy/tenant.guard';
import { Roles } from '../../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../people/auth/guards/roles.guard';
import { CreateWaitlistEntryDto } from './dto/create-waitlist-entry.dto';
import { WaitlistService } from './waitlist.service';

@ApiTags('Scheduling / Waitlist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN, Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER)
@Controller('scheduling/waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @Body() dto: CreateWaitlistEntryDto,
  ): Promise<Waitlist> {
    return this.waitlistService.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentCompanyId() companyId: number): Promise<Waitlist[]> {
    return this.waitlistService.findAll(companyId);
  }

  @Patch(':id/cancel')
  cancel(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Waitlist> {
    return this.waitlistService.cancel(companyId, id);
  }
}
