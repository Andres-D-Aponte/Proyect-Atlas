import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { Client, ClientDraft, ClientTimelineEvent } from '../models/clients.model';

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);

  list(search?: string): Promise<Client[]> {
    const url = search
      ? `${API_BASE_URL}/clients?search=${encodeURIComponent(search)}`
      : `${API_BASE_URL}/clients`;
    return firstValueFrom(this.http.get<Client[]>(url));
  }

  create(draft: ClientDraft): Promise<Client> {
    return firstValueFrom(this.http.post<Client>(`${API_BASE_URL}/clients`, this.toPayload(draft)));
  }

  update(id: number, draft: ClientDraft): Promise<Client> {
    return firstValueFrom(
      this.http.patch<Client>(`${API_BASE_URL}/clients/${id}`, this.toPayload(draft)),
    );
  }

  getTimeline(id: number): Promise<ClientTimelineEvent[]> {
    return firstValueFrom(
      this.http.get<ClientTimelineEvent[]>(`${API_BASE_URL}/clients/${id}/timeline`),
    );
  }

  private toPayload(draft: ClientDraft): Record<string, unknown> {
    return {
      name: draft.name,
      phone: draft.phone,
      email: draft.email || undefined,
      document: draft.document || undefined,
      address: draft.address || undefined,
      notes: draft.notes || undefined,
    };
  }
}
