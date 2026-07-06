import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Corte de cabello' })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre del servicio es obligatorio' })
  name?: string;

  @ApiPropertyOptional({ example: 'Corte clásico con máquina y tijera' })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Debe pertenecer a tu empresa; null la quita.',
  })
  @IsOptional()
  @IsInt({ message: 'La categoría no es válida' })
  @IsPositive({ message: 'La categoría no es válida' })
  categoryId?: number | null;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero de minutos' })
  @IsPositive({ message: 'La duración debe ser mayor a 0' })
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt({
    message: 'El tiempo de preparación debe ser un número entero de minutos',
  })
  @Min(0, { message: 'El tiempo de preparación no puede ser negativo' })
  bufferMinutes?: number;

  @ApiPropertyOptional({ example: 35000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;

  @ApiPropertyOptional({ enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType, {
    message: 'El tipo de comisión debe ser porcentaje o valor fijo',
  })
  commissionType?: CommissionType;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber({}, { message: 'La comisión debe ser un número' })
  @Min(0, { message: 'La comisión no puede ser negativa' })
  @ValidateIf(
    (dto: UpdateServiceDto) => dto.commissionType !== CommissionType.FIXED,
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
  resourceType?: ResourceType | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;
}
