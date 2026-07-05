import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import {
  Branch,
  CompanySettings,
  OpeningHour,
  UpdateCompanySettings,
} from '../models/settings.model';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);

  getCompanySettings(): Promise<CompanySettings> {
    return firstValueFrom(this.http.get<CompanySettings>(`${API_BASE_URL}/settings/company`));
  }

  updateCompanySettings(dto: UpdateCompanySettings): Promise<CompanySettings> {
    return firstValueFrom(
      this.http.patch<CompanySettings>(`${API_BASE_URL}/settings/company`, dto),
    );
  }

  listBranches(): Promise<Branch[]> {
    return firstValueFrom(this.http.get<Branch[]>(`${API_BASE_URL}/settings/branches`));
  }

  createBranch(name: string, address?: string): Promise<Branch> {
    return firstValueFrom(
      this.http.post<Branch>(`${API_BASE_URL}/settings/branches`, { name, address }),
    );
  }

  setBranchSchedule(branchId: number, schedule: OpeningHour[]): Promise<Branch> {
    return firstValueFrom(
      this.http.post<Branch>(`${API_BASE_URL}/settings/branches/${branchId}/schedule`, {
        schedule,
      }),
    );
  }
}
