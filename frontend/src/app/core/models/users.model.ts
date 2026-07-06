import { Role } from './auth.model';

export interface CompanyUser {
  id: number;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCompanyUser {
  email: string;
  password: string;
  role: Role;
}

/** Roles que un Business Admin puede crear/gestionar desde Configuración → Usuarios. */
export const ASSIGNABLE_ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'RECEPTIONIST_CASHIER', label: 'Recepcionista / Cajero' },
];

export const ROLE_LABELS: Record<Role, string> = {
  PLATFORM_OWNER: 'Platform Owner',
  BUSINESS_ADMIN: 'Business Admin',
  SUPERVISOR: 'Supervisor',
  RECEPTIONIST_CASHIER: 'Recepcionista / Cajero',
  PROFESSIONAL: 'Profesional',
};
