import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateServiceCategoryDto {
  @ApiProperty({ example: 'Cortes y peinados' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
