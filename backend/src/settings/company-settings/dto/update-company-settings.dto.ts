import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../../../generated/prisma';

export class UpdateCompanySettingsDto {
  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  @IsOptional()
  @IsUrl({}, { message: 'El logo debe ser una URL válida' })
  logoUrl?: string;

  @ApiPropertyOptional({
    example: '#1A2B3C',
    description: 'Color hexadecimal, ej. #1A2B3C.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'El color principal debe ser un color hexadecimal, ej. #1A2B3C',
  })
  primaryColor?: string;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser texto' })
  timezone?: string;

  @ApiPropertyOptional({
    example: 'COP',
    description: 'Código ISO 4217 de 3 letras.',
  })
  @IsOptional()
  @IsString()
  @Length(3, 3, {
    message: 'La moneda debe ser un código de 3 letras, ej. COP',
  })
  currency?: string;

  @ApiPropertyOptional({ example: 'es' })
  @IsOptional()
  @IsString({ message: 'El idioma debe ser texto' })
  language?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, isArray: true })
  @IsOptional()
  @IsArray({ message: 'Los métodos de pago deben ser una lista' })
  @IsEnum(PaymentMethod, {
    each: true,
    message: 'Uno de los métodos de pago no es válido',
  })
  enabledPaymentMethods?: PaymentMethod[];

  @ApiPropertyOptional({
    example: false,
    description: 'Exigir correo al registrar un cliente.',
  })
  @IsOptional()
  @IsBoolean({ message: 'requireClientEmail debe ser verdadero o falso' })
  requireClientEmail?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Exigir documento al registrar un cliente.',
  })
  @IsOptional()
  @IsBoolean({ message: 'requireClientDocument debe ser verdadero o falso' })
  requireClientDocument?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Exigir dirección al registrar un cliente.',
  })
  @IsOptional()
  @IsBoolean({ message: 'requireClientAddress debe ser verdadero o falso' })
  requireClientAddress?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'Permitir reservas sin cliente registrado previamente (lo aplicará la Agenda).',
  })
  @IsOptional()
  @IsBoolean({
    message: 'allowBookingWithoutClient debe ser verdadero o falso',
  })
  allowBookingWithoutClient?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'Si es verdadero, las citas nuevas quedan en estado Pendiente hasta ser confirmadas por el staff.',
  })
  @IsOptional()
  @IsBoolean({
    message: 'requireAppointmentApproval debe ser verdadero o falso',
  })
  requireAppointmentApproval?: boolean;

  @ApiPropertyOptional({
    example: 3,
    description:
      'Número de inasistencias a partir del cual se alerta al staff sobre un cliente.',
  })
  @IsOptional()
  @IsInt({ message: 'noShowAlertThreshold debe ser un número entero' })
  @Min(1, { message: 'noShowAlertThreshold debe ser al menos 1' })
  noShowAlertThreshold?: number;
}
