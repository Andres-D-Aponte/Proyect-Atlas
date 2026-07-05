export type Role =
  | 'PLATFORM_OWNER'
  | 'BUSINESS_ADMIN'
  | 'SUPERVISOR'
  | 'RECEPTIONIST_CASHIER'
  | 'PROFESSIONAL';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CurrentUser {
  id: number;
  email: string;
  role: Role;
  companyId?: number;
  impersonatedBy?: number;
}
