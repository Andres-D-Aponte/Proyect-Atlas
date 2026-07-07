import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ProfessionalBlockType } from '../../../../generated/prisma';

export class CreateProfessionalBlockDto {
  @ApiProperty({
    enum: ProfessionalBlockType,
    example: ProfessionalBlockType.VACATION,
  })
  @IsEnum(ProfessionalBlockType, { message: 'El tipo de bloqueo no es válido' })
  type: ProfessionalBlockType;

  @ApiProperty({ example: '2026-08-01T00:00:00.000Z' })
  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  startAt: string;

  @ApiProperty({ example: '2026-08-10T00:00:00.000Z' })
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  endAt: string;

  @ApiPropertyOptional({ example: 'Vacaciones anuales' })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}
