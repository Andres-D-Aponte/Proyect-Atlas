import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { CommissionType, ResourceType } from '../../../../generated/prisma';

export class CreateServiceDto {
  @ApiProperty({ example: 'Corte de cabello' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del servicio es obligatorio' })
  name: string;

  @ApiPropertyOptional({ example: 'Corte clásico con máquina y tijera' })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Debe pertenecer a tu empresa.',
  })
  @IsOptional()
  @IsInt({ message: 'La categoría no es válida' })
  @IsPositive({ message: 'La categoría no es válida' })
  categoryId?: number;

  @ApiProperty({
    example: 30,
    description: 'Duración del servicio en minutos.',
  })
  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @IsPositive({ message: 'La duración debe ser mayor a 0' })
  durationMinutes: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Tiempo de preparación/limpieza adicional, en minutos.',
  })
  @IsOptional()
  @IsInt({
    message: 'El tiempo de preparación debe ser un número entero de minutos',
  })
  @Min(0, { message: 'El tiempo de preparación no puede ser negativo' })
  bufferMinutes?: number;

  @ApiProperty({ example: 35000 })
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;

  @ApiPropertyOptional({
    enum: CommissionType,
    example: CommissionType.PERCENTAGE,
  })
  @IsOptional()
  @IsEnum(CommissionType, {
    message: 'El tipo de comisión debe ser porcentaje o valor fijo',
  })
  commissionType?: CommissionType;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Si commissionType es PERCENTAGE: 0–100. Si es FIXED: monto en la moneda de la empresa.',
  })
  @IsOptional()
  @IsNumber({}, { message: 'La comisión debe ser un número' })
  @Min(0, { message: 'La comisión no puede ser negativa' })
  @ValidateIf(
    (dto: CreateServiceDto) => dto.commissionType !== CommissionType.FIXED,
  )
  @Max(100, { message: 'La comisión porcentual no puede ser mayor a 100' })
  commissionValue?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: 'requiresTwoProfessionals debe ser verdadero o falso' })
  requiresTwoProfessionals?: boolean;

  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType, { message: 'El tipo de recurso no es válido' })
  resourceType?: ResourceType;
}
