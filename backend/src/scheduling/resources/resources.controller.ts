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
import { Resource, Role } from '../../../generated/prisma';
import { CurrentCompanyId } from '../../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../../shared/tenancy/tenant.guard';
import { Roles } from '../../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../people/auth/guards/roles.guard';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesService } from './resources.service';

@ApiTags('Scheduling / Resources')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN)
@Controller('scheduling/resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @Body() dto: CreateResourceDto,
  ): Promise<Resource> {
    return this.resourcesService.create(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentCompanyId() companyId: number,
    @Query('branchId') branchId?: string,
  ): Promise<Resource[]> {
    return this.resourcesService.findAll(
      companyId,
      branchId ? Number(branchId) : undefined,
    );
  }

  @Patch(':id')
  update(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateResourceDto,
  ): Promise<Resource> {
    return this.resourcesService.update(companyId, id, dto);
  }
}
