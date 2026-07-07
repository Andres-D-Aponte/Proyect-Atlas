import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsPositive,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ProfessionalScheduleRowDto {
  @ApiProperty({
    example: 1,
    description: 'Sucursal donde trabaja este horario.',
  })
  @IsInt({ message: 'La sucursal no es válida' })
  @IsPositive({ message: 'La sucursal no es válida' })
  branchId: number;

  @ApiProperty({
    minimum: 0,
    maximum: 6,
    description: '0 = domingo … 6 = sábado',
  })
  @IsInt({ message: 'El día de la semana debe ser un número' })
  @Min(0, {
    message: 'El día de la semana debe estar entre 0 (domingo) y 6 (sábado)',
  })
  @Max(6, {
    message: 'El día de la semana debe estar entre 0 (domingo) y 6 (sábado)',
  })
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  @Matches(TIME_PATTERN, {
    message: 'La hora de inicio debe tener formato HH:mm',
  })
  startsAt: string;

  @ApiProperty({ example: '18:00' })
  @Matches(TIME_PATTERN, { message: 'La hora de fin debe tener formato HH:mm' })
  endsAt: string;
}

export class SetProfessionalScheduleDto {
  @ApiProperty({ type: [ProfessionalScheduleRowDto] })
  @IsArray({ message: 'El horario debe ser una lista' })
  @ArrayMaxSize(49, {
    message: 'Demasiadas filas de horario (máximo 7 sucursales × 7 días)',
  })
  @ValidateNested({ each: true })
  @Type(() => ProfessionalScheduleRowDto)
  schedule: ProfessionalScheduleRowDto[];
}
