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
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'ChangeMe123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    enum: ASSIGNABLE_COMPANY_ROLES,
    example: Role.RECEPTIONIST_CASHIER,
  })
  @IsIn(ASSIGNABLE_COMPANY_ROLES)
  role: AssignableCompanyRole;
}
