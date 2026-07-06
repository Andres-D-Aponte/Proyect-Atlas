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
import { Client, ClientTimelineEvent, Role } from '../../generated/prisma';
import { CurrentCompanyId } from '../shared/tenancy/current-company-id.decorator';
import { TenantGuard } from '../shared/tenancy/tenant.guard';
import { Roles } from '../people/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../people/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../people/auth/guards/roles.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles(Role.BUSINESS_ADMIN, Role.SUPERVISOR, Role.RECEPTIONIST_CASHIER)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @CurrentCompanyId() companyId: number,
    @Body() dto: CreateClientDto,
  ): Promise<Client> {
    return this.clientsService.create(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentCompanyId() companyId: number,
    @Query('search') search?: string,
  ): Promise<Client[]> {
    return this.clientsService.findAll(companyId, search);
  }

  @Get(':id')
  findOne(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Client> {
    return this.clientsService.findByIdOrThrow(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClientDto,
  ): Promise<Client> {
    return this.clientsService.update(companyId, id, dto);
  }

  @Get(':id/timeline')
  getTimeline(
    @CurrentCompanyId() companyId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ClientTimelineEvent[]> {
    return this.clientsService.getTimeline(companyId, id);
  }
}
