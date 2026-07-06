import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import {
  BillingCycle,
  LicenseExpirationBehavior,
} from '../../../../generated/prisma';

export class AssignLicenseDto {
  @ApiProperty({ example: 1 })
  @IsInt({ message: 'Debes seleccionar un plan' })
  planId: number;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle, { message: 'El ciclo de facturación no es válido' })
  billingCycle: BillingCycle;

  @ApiProperty({ example: '2026-08-05T00:00:00.000Z' })
  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  endDate: string;

  @ApiPropertyOptional({
    enum: LicenseExpirationBehavior,
    default: LicenseExpirationBehavior.IMMEDIATE_READ_ONLY,
  })
  @IsOptional()
  @IsEnum(LicenseExpirationBehavior, {
    message: 'El comportamiento de vencimiento no es válido',
  })
  expirationBehavior?: LicenseExpirationBehavior;
}
