export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'TRIAL';

export type LicenseExpirationBehavior =
  | 'IMMEDIATE_READ_ONLY'
  | 'GRACE_PERIOD'
  | 'TEMPORARY_ACCESS'
  | 'FULL_BLOCK';

export interface Plan {
  id: number;
  name: string;
  enabledModules: string[];
  maxBranches: number | null;
  maxProfessionals: number | null;
  maxUsers: number | null;
  maxAppointmentsPerMonth: number | null;
  maxWhatsappConversations: number | null;
}

export interface License {
  id: number;
  companyId: number;
  planId: number;
  plan?: Plan;
  billingCycle: BillingCycle;
  endDate: string;
  expirationBehavior: LicenseExpirationBehavior;
}

export interface Company {
  id: number;
  name: string;
  isActive: boolean;
  license?: License | null;
}
