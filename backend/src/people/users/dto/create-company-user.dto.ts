import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { Role } from '../../../../generated/prisma';

export const ASSIGNABLE_COMPANY_ROLES = [
  Role.SUPERVISOR,
  Role.RECEPTIONIST_CASHIER,
] as const;

export type AssignableCompanyRole = (typeof ASSIGNABLE_COMPANY_ROLES)[number];

export class CreateCompanyUserDto {
  @ApiProperty({ example: 'recepcion@barberia-elegance.com' })
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({
    enum: ASSIGNABLE_COMPANY_ROLES,
    example: Role.RECEPTIONIST_CASHIER,
  })
  @IsIn(ASSIGNABLE_COMPANY_ROLES, {
    message: 'El rol debe ser Supervisor o Recepcionista/Cajero',
  })
  role: AssignableCompanyRole;
}
