import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { CompanyUser, CreateCompanyUser } from '../models/users.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly http = inject(HttpClient);

  list(): Promise<CompanyUser[]> {
    return firstValueFrom(this.http.get<CompanyUser[]>(`${API_BASE_URL}/settings/users`));
  }

  create(dto: CreateCompanyUser): Promise<CompanyUser> {
    return firstValueFrom(this.http.post<CompanyUser>(`${API_BASE_URL}/settings/users`, dto));
  }

  setActive(id: number, isActive: boolean): Promise<CompanyUser> {
    return firstValueFrom(
      this.http.patch<CompanyUser>(`${API_BASE_URL}/settings/users/${id}/status`, { isActive }),
    );
  }
}
