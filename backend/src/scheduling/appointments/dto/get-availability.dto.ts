import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsPositive } from 'class-validator';

export class GetAvailabilityDto {
  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'La sucursal no es válida' })
  @IsPositive({ message: 'La sucursal no es válida' })
  branchId: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'El profesional no es válido' })
  @IsPositive({ message: 'El profesional no es válido' })
  professionalId: number;

  @ApiProperty({ example: '2026-08-03' })
  @IsDateString({}, { message: 'La fecha debe ser una fecha válida' })
  date: string;
}
