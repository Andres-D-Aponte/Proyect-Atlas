import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateProfessionalDto {
  @ApiProperty({ example: 'Carlos Ruiz' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiPropertyOptional({
    example: 5,
    description:
      'Id de un usuario con rol Profesional de la misma empresa, para que pueda iniciar sesión.',
  })
  @IsOptional()
  @IsInt({ message: 'El usuario no es válido' })
  @IsPositive({ message: 'El usuario no es válido' })
  userId?: number;
}
