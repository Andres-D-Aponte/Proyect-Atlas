import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { Service, ServiceCategory, ServiceDraft } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly http = inject(HttpClient);

  listCategories(): Promise<ServiceCategory[]> {
    return firstValueFrom(this.http.get<ServiceCategory[]>(`${API_BASE_URL}/catalog/categories`));
  }

  createCategory(name: string): Promise<ServiceCategory> {
    return firstValueFrom(
      this.http.post<ServiceCategory>(`${API_BASE_URL}/catalog/categories`, { name }),
    );
  }

  renameCategory(id: number, name: string): Promise<ServiceCategory> {
    return firstValueFrom(
      this.http.patch<ServiceCategory>(`${API_BASE_URL}/catalog/categories/${id}`, { name }),
    );
  }

  deleteCategory(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${API_BASE_URL}/catalog/categories/${id}`));
  }

  listServices(): Promise<Service[]> {
    return firstValueFrom(this.http.get<Service[]>(`${API_BASE_URL}/catalog/services`));
  }

  createService(draft: ServiceDraft): Promise<Service> {
    return firstValueFrom(
      this.http.post<Service>(`${API_BASE_URL}/catalog/services`, this.toPayload(draft)),
    );
  }

  updateService(id: number, draft: ServiceDraft): Promise<Service> {
    return firstValueFrom(
      this.http.patch<Service>(`${API_BASE_URL}/catalog/services/${id}`, this.toPayload(draft)),
    );
  }

  setActive(id: number, isActive: boolean): Promise<Service> {
    return firstValueFrom(
      this.http.patch<Service>(`${API_BASE_URL}/catalog/services/${id}`, { isActive }),
    );
  }

  private toPayload(draft: ServiceDraft): Record<string, unknown> {
    return {
      name: draft.name,
      description: draft.description || undefined,
      categoryId: draft.categoryId,
      durationMinutes: draft.durationMinutes,
      bufferMinutes: draft.bufferMinutes,
      price: draft.price,
      commissionType: draft.commissionType,
      commissionValue: draft.commissionValue,
      requiresTwoProfessionals: draft.requiresTwoProfessionals,
      resourceType: draft.resourceType || null,
    };
  }
}
