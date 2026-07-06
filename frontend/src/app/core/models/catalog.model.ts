export type CommissionType = 'PERCENTAGE' | 'FIXED';
export type ResourceType = 'ROOM' | 'CHAIR' | 'CABIN' | 'MACHINE' | 'STRETCHER';

export const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'ROOM', label: 'Sala' },
  { value: 'CHAIR', label: 'Silla' },
  { value: 'CABIN', label: 'Cabina' },
  { value: 'MACHINE', label: 'Máquina' },
  { value: 'STRETCHER', label: 'Camilla' },
];

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  ROOM: 'Sala',
  CHAIR: 'Silla',
  CABIN: 'Cabina',
  MACHINE: 'Máquina',
  STRETCHER: 'Camilla',
};

export interface ServiceCategory {
  id: number;
  companyId: number;
  name: string;
}

export interface Service {
  id: number;
  companyId: number;
  categoryId: number | null;
  category: ServiceCategory | null;
  name: string;
  description: string | null;
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  commissionType: CommissionType;
  commissionValue: number;
  requiresTwoProfessionals: boolean;
  resourceType: ResourceType | null;
  isActive: boolean;
}

export interface ServiceDraft {
  name: string;
  description: string;
  categoryId: number | null;
  durationMinutes: number;
  bufferMinutes: number;
  price: number;
  commissionType: CommissionType;
  commissionValue: number;
  requiresTwoProfessionals: boolean;
  resourceType: ResourceType | '';
}

export function emptyServiceDraft(): ServiceDraft {
  return {
    name: '',
    description: '',
    categoryId: null,
    durationMinutes: 30,
    bufferMinutes: 0,
    price: 0,
    commissionType: 'PERCENTAGE',
    commissionValue: 0,
    requiresTwoProfessionals: false,
    resourceType: '',
  };
}

export function draftFromService(service: Service): ServiceDraft {
  return {
    name: service.name,
    description: service.description ?? '',
    categoryId: service.categoryId,
    durationMinutes: service.durationMinutes,
    bufferMinutes: service.bufferMinutes,
    price: service.price,
    commissionType: service.commissionType,
    commissionValue: service.commissionValue,
    requiresTwoProfessionals: service.requiresTwoProfessionals,
    resourceType: service.resourceType ?? '',
  };
}
