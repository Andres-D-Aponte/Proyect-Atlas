import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Sucursal Centro' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre de la sucursal es obligatorio' })
  name: string;

  @ApiPropertyOptional({ example: 'Calle 10 # 5-30' })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  address?: string;

  @ApiPropertyOptional({
    description: 'Nula = usa la zona horaria de la empresa.',
  })
  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser texto' })
  timezone?: string;
}
