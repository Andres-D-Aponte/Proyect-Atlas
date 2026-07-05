import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import {
  BillingCycle,
  LicenseExpirationBehavior,
} from '../../../../generated/prisma';

export class AssignLicenseDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  planId: number;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiProperty({ example: '2026-08-05T00:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    enum: LicenseExpirationBehavior,
    default: LicenseExpirationBehavior.IMMEDIATE_READ_ONLY,
  })
  @IsOptional()
  @IsEnum(LicenseExpirationBehavior)
  expirationBehavior?: LicenseExpirationBehavior;
}
