import { Role } from '../../../generated/prisma';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}
