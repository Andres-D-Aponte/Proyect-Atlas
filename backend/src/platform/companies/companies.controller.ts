import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Company, License, Role } from '../../../generated/prisma';
import type { AuthenticatedUser } from '../../people/auth/auth-user.interface';
import { AuthTokensDto } from '../../people/auth/dto/auth-tokens.dto';
import { CurrentUser } from '../../people/auth/decorators/current-user.decorator';
import { Roles } from '../../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../people/auth/guards/roles.guard';
import { CreateBusinessAdminDto } from '../../people/users/dto/create-business-admin.dto';
import { SafeUser, UsersService } from '../../people/users/users.service';
import { ImpersonationService } from '../impersonation/impersonation.service';
import { AssignLicenseDto } from '../licenses/dto/assign-license.dto';
import { LicensesService } from '../licenses/licenses.service';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { ImpersonateDto } from '../impersonation/dto/impersonate.dto';

@ApiTags('Platform / Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PLATFORM_OWNER)
@Controller('platform/companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly licensesService: LicensesService,
    private readonly impersonationService: ImpersonationService,
    private readonly usersService: UsersService,
  ) {}

  @Post()
  create(@Body() dto: CreateCompanyDto): Promise<Company> {
    return this.companiesService.create(dto);
  }

  @Get()
  findAll(): Promise<Company[]> {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Company> {
    return this.companiesService.findByIdOrThrow(id);
  }

  @Post(':id/license')
  assignLicense(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignLicenseDto,
  ): Promise<License> {
    return this.licensesService.assign(id, dto);
  }

  @Get(':id/license')
  getLicense(@Param('id', ParseIntPipe) id: number): Promise<License> {
    return this.licensesService.findByCompanyIdOrThrow(id);
  }

  @Post(':id/admin')
  createAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateBusinessAdminDto,
  ): Promise<SafeUser> {
    return this.usersService.createBusinessAdmin(id, dto);
  }

  @Post(':id/impersonate')
  impersonate(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ImpersonateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<AuthTokensDto> {
    return this.impersonationService.impersonate(
      user.id,
      id,
      dto.reason,
      req.ip,
    );
  }
}
