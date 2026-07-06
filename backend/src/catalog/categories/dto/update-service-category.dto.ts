import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateServiceCategoryDto {
  @ApiProperty({ example: 'Cortes y peinados' })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre de la categoría es obligatorio' })
  name: string;
}
