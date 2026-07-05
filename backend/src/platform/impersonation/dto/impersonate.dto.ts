import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ImpersonateDto {
  @ApiProperty({
    example: 'Soporte técnico: el cliente reporta un error en su agenda.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason: string;
}
