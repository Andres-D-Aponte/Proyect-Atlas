import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'owner@atlas.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @MinLength(8)
  password: string;
}
