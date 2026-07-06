import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetUserActiveDto {
  @ApiProperty({ example: false })
  @IsBoolean({ message: 'isActive debe ser verdadero o falso' })
  isActive: boolean;
}
