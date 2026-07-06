import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsString({ message: 'El refresh token es obligatorio' })
  refreshToken: string;
}
