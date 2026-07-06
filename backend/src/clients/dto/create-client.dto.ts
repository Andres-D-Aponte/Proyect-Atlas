import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({ example: 'María Pérez' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  name: string;

  @ApiProperty({ example: '3001234567' })
  @IsString({ message: 'El teléfono debe ser texto' })
  @IsNotEmpty({ message: 'El teléfono es obligatorio' })
  phone: string;

  @ApiPropertyOptional({ example: 'maria@correo.com' })
  @IsOptional()
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email?: string;

  @ApiPropertyOptional({ example: '1020304050' })
  @IsOptional()
  @IsString({ message: 'El documento debe ser texto' })
  document?: string;

  @ApiPropertyOptional({ example: 'Calle 10 # 5-30' })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  address?: string;

  @ApiPropertyOptional({ example: 'Prefiere cortes cortos.' })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}
