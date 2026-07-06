import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateServiceCategoryDto {
  @ApiProperty({ example: 'Cortes' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
