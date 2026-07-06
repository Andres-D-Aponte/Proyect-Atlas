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
import { Role, ServiceCategory } from '../../../generated/prisma';
import { CurrentCompanyId } from '../../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../../shared/tenancy/tenant.guard';
import { Roles } from '../../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../people/auth/guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';

@ApiTags('Catalog / Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN)
@Controller('catalog/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @Body() dto: CreateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    return this.categoriesService.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentCompanyId() companyId: number): Promise<ServiceCategory[]> {
    return this.categoriesService.findAll(companyId);
  }

  @Patch(':id')
  update(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategory> {
    return this.categoriesService.update(companyId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.categoriesService.remove(companyId, id);
  }
}
