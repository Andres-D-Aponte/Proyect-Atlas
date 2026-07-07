import { ResourceType } from './catalog.model';

export type ProfessionalBlockType = 'LUNCH' | 'TRAINING' | 'VACATION' | 'OTHER';

export const PROFESSIONAL_BLOCK_TYPE_OPTIONS: { value: ProfessionalBlockType; label: string }[] = [
  { value: 'LUNCH', label: 'Almuerzo' },
  { value: 'TRAINING', label: 'Capacitación' },
  { value: 'VACATION', label: 'Vacaciones' },
  { value: 'OTHER', label: 'Otro' },
];

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'WAITING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  WAITING: 'En espera',
  IN_PROGRESS: 'En atención',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
  RESCHEDULED: 'Reagendada',
};

export const APPOINTMENT_STATUS_OPTIONS: { value: AppointmentStatus; label: string }[] = (
  Object.entries(APPOINTMENT_STATUS_LABELS) as [AppointmentStatus, string][]
).map(([value, label]) => ({ value, label }));

export type WaitlistStatus = 'WAITING' | 'OFFERED' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';

export const WAITLIST_STATUS_LABELS: Record<WaitlistStatus, string> = {
  WAITING: 'En espera',
  OFFERED: 'Ofrecido',
  CONVERTED: 'Convertido en cita',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

export interface ProfessionalSchedule {
  id: number;
  professionalId: number;
  branchId: number;
  dayOfWeek: number;
  startsAt: string;
  endsAt: string;
}

export interface ProfessionalBlock {
  id: number;
  professionalId: number;
  type: ProfessionalBlockType;
  startAt: string;
  endAt: string;
  notes: string | null;
}

export interface Professional {
  id: number;
  companyId: number;
  userId: number | null;
  name: string;
  isActive: boolean;
  schedules?: ProfessionalSchedule[];
  blocks?: ProfessionalBlock[];
}

export interface ProfessionalDraft {
  name: string;
  userId: number | null;
}

export function emptyProfessionalDraft(): ProfessionalDraft {
  return { name: '', userId: null };
}

export interface Resource {
  id: number;
  companyId: number;
  branchId: number;
  type: ResourceType;
  name: string;
  isActive: boolean;
}

export interface ScheduleException {
  id: number;
  companyId: number;
  branchId: number | null;
  date: string;
  reason: string;
}

export interface AppointmentHistoryEvent {
  id: number;
  appointmentId: number;
  description: string;
  createdAt: string;
}

export interface AppointmentParty {
  id: number;
  name: string;
}

export interface Appointment {
  id: number;
  companyId: number;
  branchId: number;
  clientId: number | null;
  client?: { id: number; name: string; phone: string } | null;
  serviceId: number;
  service?: { id: number; name: string; durationMinutes: number };
  professionalId: number;
  professional?: AppointmentParty;
  secondProfessionalId: number | null;
  secondProfessional?: AppointmentParty | null;
  resourceId: number | null;
  resource?: AppointmentParty | null;
  startAt: string;
  endAt: string;
  blockedUntil: string;
  status: AppointmentStatus;
  notes: string | null;
  historyEvents?: AppointmentHistoryEvent[];
}

export interface AppointmentDraft {
  branchId: number | null;
  clientId: number | null;
  serviceId: number | null;
  professionalId: number | null;
  secondProfessionalId: number | null;
  resourceId: number | null;
  startAt: string;
  notes: string;
}

export function emptyAppointmentDraft(): AppointmentDraft {
  return {
    branchId: null,
    clientId: null,
    serviceId: null,
    professionalId: null,
    secondProfessionalId: null,
    resourceId: null,
    startAt: '',
    notes: '',
  };
}

export interface AvailabilityWindow {
  startsAt: string;
  endsAt: string;
}

export interface AvailabilityBusyRange {
  startAt: string;
  endAt: string;
  label: string;
}

export interface ProfessionalAvailability {
  date: string;
  dayOfWeek: number;
  isHoliday: boolean;
  schedules: AvailabilityWindow[];
  busy: AvailabilityBusyRange[];
}

export interface Waitlist {
  id: number;
  companyId: number;
  branchId: number;
  clientId: number;
  client?: { id: number; name: string };
  serviceId: number;
  service?: { id: number; name: string };
  professionalId: number | null;
  professional?: AppointmentParty | null;
  status: WaitlistStatus;
  offeredAt: string | null;
  createdAt: string;
}
