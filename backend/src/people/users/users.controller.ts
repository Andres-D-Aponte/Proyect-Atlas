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
import { Role } from '../../../generated/prisma';
import { CurrentCompanyId } from '../../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../../shared/tenancy/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { SafeUser, UsersService } from './users.service';

@ApiTags('Settings / Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN)
@Controller('settings/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @Body() dto: CreateCompanyUserDto,
  ): Promise<SafeUser> {
    return this.usersService.createCompanyUser(companyId, dto);
  }

  @Get()
  findAll(@CurrentCompanyId() companyId: number): Promise<SafeUser[]> {
    return this.usersService.listManageableByCompany(companyId);
  }

  @Patch(':id/status')
  setActive(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetUserActiveDto,
  ): Promise<SafeUser> {
    return this.usersService.setActive(companyId, id, dto.isActive);
  }
}
