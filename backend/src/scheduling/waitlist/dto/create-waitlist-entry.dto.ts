import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class CreateWaitlistEntryDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'La sucursal no es válida' })
  @IsPositive({ message: 'La sucursal no es válida' })
  branchId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El cliente no es válido' })
  @IsPositive({ message: 'El cliente no es válido' })
  clientId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El servicio no es válido' })
  @IsPositive({ message: 'El servicio no es válido' })
  serviceId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Nulo = cualquier profesional sirve.',
  })
  @IsOptional()
  @IsInt({ message: 'El profesional no es válido' })
  @IsPositive({ message: 'El profesional no es válido' })
  professionalId?: number;
}
