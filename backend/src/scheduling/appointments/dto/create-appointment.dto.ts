import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'La sucursal no es válida' })
  @IsPositive({ message: 'La sucursal no es válida' })
  branchId: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Nulo solo si la empresa permite reservar sin cliente registrado.',
  })
  @IsOptional()
  @IsInt({ message: 'El cliente no es válido' })
  @IsPositive({ message: 'El cliente no es válido' })
  clientId?: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El servicio no es válido' })
  @IsPositive({ message: 'El servicio no es válido' })
  serviceId: number;

  @ApiProperty({ example: 1 })
  @IsInt({ message: 'El profesional no es válido' })
  @IsPositive({ message: 'El profesional no es válido' })
  professionalId: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Obligatorio si el servicio requiere dos profesionales.',
  })
  @IsOptional()
  @IsInt({ message: 'El segundo profesional no es válido' })
  @IsPositive({ message: 'El segundo profesional no es válido' })
  secondProfessionalId?: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Si el servicio requiere un recurso y no se indica, se asigna uno disponible automáticamente.',
  })
  @IsOptional()
  @IsInt({ message: 'El recurso no es válido' })
  @IsPositive({ message: 'El recurso no es válido' })
  resourceId?: number;

  @ApiProperty({ example: '2026-08-01T14:00:00.000Z' })
  @IsDateString(
    {},
    { message: 'La fecha/hora de inicio debe ser una fecha válida' },
  )
  startAt: string;

  @ApiPropertyOptional({ example: 'Cliente pidió turno temprano.' })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}
