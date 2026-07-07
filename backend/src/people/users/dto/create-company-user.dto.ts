import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { Role } from '../../../../generated/prisma';

/// Desde la Etapa 8, incluye PROFESSIONAL: un profesional puede vincularse a
/// un usuario para iniciar sesión sin recrear sus datos (ver backlog Épica 5
/// y docs/modules/08_agenda.md). Antes de la Etapa 8 este rol no tenía forma
/// de crearse porque nada lo consumía todavía.
export const ASSIGNABLE_COMPANY_ROLES = [
  Role.SUPERVISOR,
  Role.RECEPTIONIST_CASHIER,
  Role.PROFESSIONAL,
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
    message: 'El rol debe ser Supervisor, Recepcionista/Cajero o Profesional',
  })
  role: AssignableCompanyRole;
}
