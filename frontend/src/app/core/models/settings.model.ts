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

/** Etiquetas amigables — el valor que viaja al backend sigue siendo el enum en inglés. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  CARD: 'Tarjeta',
  CREDIT: 'Crédito',
  OTHER: 'Otro',
};

/**
 * Lista corta a propósito (ver docs/05_Practical_Guide.md): empezamos solo con
 * COP y USD para que configurar una empresa sea simple; se agregan más monedas
 * cuando haga falta, sin requerir ningún cambio en el backend (ya acepta
 * cualquier código ISO 4217 de 3 letras).
 */
export const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'COP', label: 'COP — Peso colombiano' },
  { value: 'USD', label: 'USD — Dólar estadounidense' },
];

/** Lista curada de zonas horarias comunes; se puede ampliar más adelante. */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'America/Bogota', label: 'Bogotá (Colombia)' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (México)' },
  { value: 'America/Lima', label: 'Lima (Perú)' },
  { value: 'America/Santiago', label: 'Santiago (Chile)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (Argentina)' },
  { value: 'America/New_York', label: 'Nueva York (EE. UU., costa este)' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (EE. UU., costa oeste)' },
  { value: 'Europe/Madrid', label: 'Madrid (España)' },
  { value: 'UTC', label: 'UTC' },
];

/** Solo español por ahora (ver PRD sección 4.6); se amplía cuando haya soporte real. */
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'es', label: 'Español' },
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
  requireClientEmail: boolean;
  requireClientDocument: boolean;
  requireClientAddress: boolean;
  allowBookingWithoutClient: boolean;
  requireAppointmentApproval: boolean;
  noShowAlertThreshold: number;
}

export interface UpdateCompanySettings {
  logoUrl?: string;
  primaryColor?: string;
  timezone?: string;
  currency?: string;
  language?: string;
  enabledPaymentMethods?: PaymentMethod[];
  requireClientEmail?: boolean;
  requireClientDocument?: boolean;
  requireClientAddress?: boolean;
  allowBookingWithoutClient?: boolean;
  requireAppointmentApproval?: boolean;
  noShowAlertThreshold?: number;
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
