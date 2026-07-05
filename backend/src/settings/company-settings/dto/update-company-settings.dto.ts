import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';
import { PaymentMethod } from '../../../../generated/prisma';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    example: '#1A2B3C',
    description: 'Color hexadecimal, ej. #1A2B3C.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'primaryColor debe ser un color hexadecimal, ej. #1A2B3C',
  })
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({
    example: 'COP',
    description: 'Código ISO 4217 de 3 letras.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(PaymentMethod, { each: true })
  enabledPaymentMethods?: PaymentMethod[];
}
