import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import {
  Appointment,
  AppointmentDraft,
  AppointmentStatus,
  Professional,
  ProfessionalAvailability,
  ProfessionalBlock,
  ProfessionalBlockType,
  ProfessionalDraft,
  ProfessionalSchedule,
  Resource,
  ScheduleException,
  Waitlist,
} from '../models/scheduling.model';
import { ResourceType } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class SchedulingService {
  private readonly http = inject(HttpClient);

  // Profesionales
  listProfessionals(): Promise<Professional[]> {
    return firstValueFrom(
      this.http.get<Professional[]>(`${API_BASE_URL}/scheduling/professionals`),
    );
  }

  getProfessional(id: number): Promise<Professional> {
    return firstValueFrom(
      this.http.get<Professional>(`${API_BASE_URL}/scheduling/professionals/${id}`),
    );
  }

  createProfessional(draft: ProfessionalDraft): Promise<Professional> {
    return firstValueFrom(
      this.http.post<Professional>(`${API_BASE_URL}/scheduling/professionals`, {
        name: draft.name,
        userId: draft.userId ?? undefined,
      }),
    );
  }

  setProfessionalSchedule(
    professionalId: number,
    schedule: Pick<ProfessionalSchedule, 'branchId' | 'dayOfWeek' | 'startsAt' | 'endsAt'>[],
  ): Promise<Professional> {
    return firstValueFrom(
      this.http.post<Professional>(
        `${API_BASE_URL}/scheduling/professionals/${professionalId}/schedule`,
        { schedule },
      ),
    );
  }

  createProfessionalBlock(
    professionalId: number,
    block: { type: ProfessionalBlockType; startAt: string; endAt: string; notes?: string },
  ): Promise<ProfessionalBlock> {
    return firstValueFrom(
      this.http.post<ProfessionalBlock>(
        `${API_BASE_URL}/scheduling/professionals/${professionalId}/blocks`,
        block,
      ),
    );
  }

  removeProfessionalBlock(professionalId: number, blockId: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${API_BASE_URL}/scheduling/professionals/${professionalId}/blocks/${blockId}`,
      ),
    );
  }

  // Recursos
  listResources(branchId?: number): Promise<Resource[]> {
    const url = branchId
      ? `${API_BASE_URL}/scheduling/resources?branchId=${branchId}`
      : `${API_BASE_URL}/scheduling/resources`;
    return firstValueFrom(this.http.get<Resource[]>(url));
  }

  createResource(branchId: number, type: ResourceType, name: string): Promise<Resource> {
    return firstValueFrom(
      this.http.post<Resource>(`${API_BASE_URL}/scheduling/resources`, { branchId, type, name }),
    );
  }

  setResourceActive(id: number, isActive: boolean): Promise<Resource> {
    return firstValueFrom(
      this.http.patch<Resource>(`${API_BASE_URL}/scheduling/resources/${id}`, { isActive }),
    );
  }

  // Excepciones de horario (festivos/cierres)
  listScheduleExceptions(): Promise<ScheduleException[]> {
    return firstValueFrom(
      this.http.get<ScheduleException[]>(`${API_BASE_URL}/scheduling/schedule-exceptions`),
    );
  }

  createScheduleException(
    date: string,
    reason: string,
    branchId?: number,
  ): Promise<ScheduleException> {
    return firstValueFrom(
      this.http.post<ScheduleException>(`${API_BASE_URL}/scheduling/schedule-exceptions`, {
        date,
        reason,
        branchId,
      }),
    );
  }

  removeScheduleException(id: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${API_BASE_URL}/scheduling/schedule-exceptions/${id}`),
    );
  }

  // Citas
  listAppointments(filters?: {
    branchId?: number;
    professionalId?: number;
    clientId?: number;
    status?: AppointmentStatus;
  }): Promise<Appointment[]> {
    const params = new URLSearchParams();
    if (filters?.branchId) params.set('branchId', String(filters.branchId));
    if (filters?.professionalId) params.set('professionalId', String(filters.professionalId));
    if (filters?.clientId) params.set('clientId', String(filters.clientId));
    if (filters?.status) params.set('status', filters.status);
    const query = params.toString();
    const url = query
      ? `${API_BASE_URL}/scheduling/appointments?${query}`
      : `${API_BASE_URL}/scheduling/appointments`;
    return firstValueFrom(this.http.get<Appointment[]>(url));
  }

  getAvailability(
    branchId: number,
    professionalId: number,
    date: string,
  ): Promise<ProfessionalAvailability> {
    return firstValueFrom(
      this.http.get<ProfessionalAvailability>(
        `${API_BASE_URL}/scheduling/appointments/availability`,
        { params: { branchId, professionalId, date } },
      ),
    );
  }

  getAppointment(id: number): Promise<Appointment> {
    return firstValueFrom(
      this.http.get<Appointment>(`${API_BASE_URL}/scheduling/appointments/${id}`),
    );
  }

  createAppointment(draft: AppointmentDraft): Promise<Appointment> {
    return firstValueFrom(
      this.http.post<Appointment>(`${API_BASE_URL}/scheduling/appointments`, {
        branchId: draft.branchId,
        clientId: draft.clientId ?? undefined,
        serviceId: draft.serviceId,
        professionalId: draft.professionalId,
        secondProfessionalId: draft.secondProfessionalId ?? undefined,
        resourceId: draft.resourceId ?? undefined,
        startAt: draft.startAt,
        notes: draft.notes || undefined,
      }),
    );
  }

  setAppointmentStatus(id: number, status: AppointmentStatus): Promise<Appointment> {
    return firstValueFrom(
      this.http.patch<Appointment>(`${API_BASE_URL}/scheduling/appointments/${id}`, { status }),
    );
  }

  updateAppointment(
    id: number,
    changes: Partial<{
      professionalId: number;
      secondProfessionalId: number;
      serviceId: number;
      startAt: string;
      notes: string;
    }>,
  ): Promise<Appointment> {
    return firstValueFrom(
      this.http.patch<Appointment>(`${API_BASE_URL}/scheduling/appointments/${id}`, changes),
    );
  }

  // Lista de espera
  listWaitlist(): Promise<Waitlist[]> {
    return firstValueFrom(this.http.get<Waitlist[]>(`${API_BASE_URL}/scheduling/waitlist`));
  }

  createWaitlistEntry(entry: {
    branchId: number;
    clientId: number;
    serviceId: number;
    professionalId?: number;
  }): Promise<Waitlist> {
    return firstValueFrom(
      this.http.post<Waitlist>(`${API_BASE_URL}/scheduling/waitlist`, entry),
    );
  }

  cancelWaitlistEntry(id: number): Promise<Waitlist> {
    return firstValueFrom(
      this.http.patch<Waitlist>(`${API_BASE_URL}/scheduling/waitlist/${id}/cancel`, {}),
    );
  }
}
