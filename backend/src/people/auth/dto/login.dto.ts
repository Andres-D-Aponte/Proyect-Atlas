import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@atlas.dev' })
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
