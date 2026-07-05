import { Role } from '../../../generated/prisma';

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: Role;
  /** Solo presente durante una sesión de impersonación del Platform Owner. */
  companyId?: number;
  /** Id del Platform Owner original, solo presente durante impersonación. */
  impersonatedBy?: number;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
  companyId?: number;
  impersonatedBy?: number;
}
