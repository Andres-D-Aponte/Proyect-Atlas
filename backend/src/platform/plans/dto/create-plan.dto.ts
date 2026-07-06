import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro' })
  @IsString({ message: 'El nombre del plan es obligatorio' })
  name: string;

  @ApiPropertyOptional({
    example: ['whatsapp', 'inventory'],
    description: 'Claves de los módulos opcionales habilitados en este plan.',
  })
  @IsOptional()
  @IsArray({ message: 'Los módulos habilitados deben ser una lista' })
  @IsString({ each: true, message: 'Cada módulo debe ser texto' })
  enabledModules?: string[];

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt({ message: 'El límite de sucursales debe ser un número entero' })
  @Min(1, { message: 'El límite de sucursales debe ser al menos 1' })
  maxBranches?: number;

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt({ message: 'El límite de profesionales debe ser un número entero' })
  @Min(1, { message: 'El límite de profesionales debe ser al menos 1' })
  maxProfessionals?: number;

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt({ message: 'El límite de usuarios debe ser un número entero' })
  @Min(1, { message: 'El límite de usuarios debe ser al menos 1' })
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt({ message: 'El límite de citas por mes debe ser un número entero' })
  @Min(1, { message: 'El límite de citas por mes debe ser al menos 1' })
  maxAppointmentsPerMonth?: number;

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt({
    message:
      'El límite de conversaciones de WhatsApp debe ser un número entero',
  })
  @Min(1, {
    message: 'El límite de conversaciones de WhatsApp debe ser al menos 1',
  })
  maxWhatsappConversations?: number;
}
