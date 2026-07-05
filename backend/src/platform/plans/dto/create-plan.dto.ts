import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: ['whatsapp', 'inventory'],
    description: 'Claves de los módulos opcionales habilitados en este plan.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledModules?: string[];

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBranches?: number;

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxProfessionals?: number;

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number;

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxAppointmentsPerMonth?: number;

  @ApiPropertyOptional({ description: 'Sin valor = sin límite.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxWhatsappConversations?: number;
}
