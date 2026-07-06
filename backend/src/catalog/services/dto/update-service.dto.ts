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
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'Corte clásico con máquina y tijera' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Debe pertenecer a tu empresa; null la quita.',
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  categoryId?: number | null;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @IsPositive()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMinutes?: number;

  @ApiPropertyOptional({ example: 35000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ enum: CommissionType })
  @IsOptional()
  @IsEnum(CommissionType)
  commissionType?: CommissionType;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @ValidateIf(
    (dto: UpdateServiceDto) => dto.commissionType !== CommissionType.FIXED,
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
  resourceType?: ResourceType | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
