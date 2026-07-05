export type PaymentMethod = 'CASH' | 'TRANSFER' | 'NEQUI' | 'DAVIPLATA' | 'CARD' | 'CREDIT' | 'OTHER';

export const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'CASH',
  'TRANSFER',
  'NEQUI',
  'DAVIPLATA',
  'CARD',
  'CREDIT',
  'OTHER',
];

export interface CompanySettings {
  id: number;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  timezone: string;
  currency: string;
  language: string;
  enabledPaymentMethods: PaymentMethod[];
}

export interface UpdateCompanySettings {
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  enabledPaymentMethods?: PaymentMethod[];
}

export interface OpeningHour {
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
}

export interface Branch {
  id: number;
  companyId: number;
  name: string;
  address: string | null;
  timezone: string | null;
  openingHours: OpeningHour[] | null;
  isActive: boolean;
}
