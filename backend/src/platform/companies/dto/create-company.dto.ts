import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Barbería Elegance' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
