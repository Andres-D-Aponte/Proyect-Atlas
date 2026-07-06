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
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Corte clásico con máquina y tijera' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Debe pertenecer a tu empresa.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  categoryId?: number;

  @ApiProperty({
    example: 30,
    description: 'Duración del servicio en minutos.',
  })
  @IsInt()
  @IsPositive()
  durationMinutes: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Tiempo de preparación/limpieza adicional, en minutos.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMinutes?: number;

  @ApiProperty({ example: 35000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    enum: CommissionType,
    example: CommissionType.PERCENTAGE,
  })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Si commissionType es PERCENTAGE: 0–100. Si es FIXED: monto en la moneda de la empresa.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @ValidateIf(
    (dto: CreateServiceDto) => dto.commissionType !== CommissionType.FIXED,
  )
  @Max(100)
  commissionValue?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresTwoProfessionals?: boolean;

  @ApiPropertyOptional({ enum: ResourceType })
  @IsOptional()
  @IsEnum(ResourceType)
  resourceType?: ResourceType;
}
