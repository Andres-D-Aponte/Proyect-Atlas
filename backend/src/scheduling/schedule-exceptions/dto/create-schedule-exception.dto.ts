import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateScheduleExceptionDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Nulo = aplica a todas las sucursales de la empresa.',
  })
  @IsOptional()
  @IsInt({ message: 'La sucursal no es válida' })
  @IsPositive({ message: 'La sucursal no es válida' })
  branchId?: number;

  @ApiProperty({ example: '2026-12-25' })
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida' })
  date: string;

  @ApiProperty({ example: 'Navidad' })
  @IsString({ message: 'El motivo debe ser texto' })
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  reason: string;
}
