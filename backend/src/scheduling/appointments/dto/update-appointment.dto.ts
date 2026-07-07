import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { AppointmentStatus } from '../../../../generated/prisma';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus, { message: 'El estado no es válido' })
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({ message: 'El cliente no es válido' })
  @IsPositive({ message: 'El cliente no es válido' })
  clientId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({ message: 'El servicio no es válido' })
  @IsPositive({ message: 'El servicio no es válido' })
  serviceId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({ message: 'El profesional no es válido' })
  @IsPositive({ message: 'El profesional no es válido' })
  professionalId?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt({ message: 'El segundo profesional no es válido' })
  @IsPositive({ message: 'El segundo profesional no es válido' })
  secondProfessionalId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt({ message: 'El recurso no es válido' })
  @IsPositive({ message: 'El recurso no es válido' })
  resourceId?: number;

  @ApiPropertyOptional({
    example: '2026-08-01T15:00:00.000Z',
    description: 'Enviar para reagendar.',
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha/hora de inicio debe ser una fecha válida' },
  )
  startAt?: string;

  @ApiPropertyOptional({ example: 'Cliente llamó a confirmar.' })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}
