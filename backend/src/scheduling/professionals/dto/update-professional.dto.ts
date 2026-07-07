import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class UpdateProfessionalDto {
  @ApiPropertyOptional({ example: 'Carlos Ruiz' })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 5,
    description:
      'Id de un usuario con rol Profesional de la misma empresa; null lo desvincula.',
  })
  @IsOptional()
  @IsInt({ message: 'El usuario no es válido' })
  @IsPositive({ message: 'El usuario no es válido' })
  userId?: number | null;
}
