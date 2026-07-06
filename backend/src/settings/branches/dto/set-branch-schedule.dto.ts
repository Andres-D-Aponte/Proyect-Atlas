import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class OpeningHourDto {
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
    message: 'La hora de apertura debe tener formato HH:mm',
  })
  opensAt: string;

  @ApiProperty({ example: '18:00' })
  @Matches(TIME_PATTERN, {
    message: 'La hora de cierre debe tener formato HH:mm',
  })
  closesAt: string;
}

export class SetBranchScheduleDto {
  @ApiProperty({ type: [OpeningHourDto] })
  @IsArray({ message: 'El horario debe ser una lista' })
  @ArrayMaxSize(7, { message: 'No puede haber más de 7 días en el horario' })
  @ValidateNested({ each: true })
  @Type(() => OpeningHourDto)
  schedule: OpeningHourDto[];
}
