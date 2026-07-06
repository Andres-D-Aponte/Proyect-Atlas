import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ImpersonateDto {
  @ApiProperty({
    example: 'Soporte técnico: el cliente reporta un error en su agenda.',
  })
  @IsString({ message: 'El motivo debe ser texto' })
  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @MinLength(5, { message: 'El motivo debe tener al menos 5 caracteres' })
  reason: string;
}
