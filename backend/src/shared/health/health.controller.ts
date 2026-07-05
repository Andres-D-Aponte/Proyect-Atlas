import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthService, HealthStatus } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({
    description: 'El servicio y la base de datos están operativos.',
  })
  @ApiServiceUnavailableResponse({
    description: 'La base de datos no está disponible.',
  })
  check(): Promise<HealthStatus> {
    return this.healthService.check();
  }
}
