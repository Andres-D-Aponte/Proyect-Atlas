import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { AuthTokens } from '../models/auth.model';
import { Company } from '../models/platform.model';
import { CompanyUser } from '../models/users.model';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly http = inject(HttpClient);

  listCompanies(): Promise<Company[]> {
    return firstValueFrom(this.http.get<Company[]>(`${API_BASE_URL}/platform/companies`));
  }

  createCompany(name: string): Promise<Company> {
    return firstValueFrom(this.http.post<Company>(`${API_BASE_URL}/platform/companies`, { name }));
  }

  impersonate(companyId: number, reason: string): Promise<AuthTokens> {
    return firstValueFrom(
      this.http.post<AuthTokens>(`${API_BASE_URL}/platform/companies/${companyId}/impersonate`, {
        reason,
      }),
    );
  }

  createBusinessAdmin(companyId: number, email: string, password: string): Promise<CompanyUser> {
    return firstValueFrom(
      this.http.post<CompanyUser>(`${API_BASE_URL}/platform/companies/${companyId}/admin`, {
        email,
        password,
      }),
    );
  }
}
