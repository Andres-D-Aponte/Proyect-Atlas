import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { AuthTokens, CurrentUser } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'atlas.accessToken';
const REFRESH_TOKEN_KEY = 'atlas.refreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly accessTokenSignal = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  private readonly currentUserSignal = signal<CurrentUser | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.accessTokenSignal() !== null);

  get accessToken(): string | null {
    return this.accessTokenSignal();
  }

  private get refreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  async login(email: string, password: string): Promise<void> {
    const tokens = await firstValueFrom(
      this.http.post<AuthTokens>(`${API_BASE_URL}/auth/login`, { email, password }),
    );
    this.storeTokens(tokens);
    await this.loadCurrentUser();
  }

  async loadCurrentUser(): Promise<CurrentUser> {
    const user = await firstValueFrom(this.http.get<CurrentUser>(`${API_BASE_URL}/auth/me`));
    this.currentUserSignal.set(user);
    return user;
  }

  /** Cambia de sesión sin pasar por login: usado tras impersonar una empresa. */
  async useTokens(tokens: AuthTokens): Promise<void> {
    this.storeTokens(tokens);
    await this.loadCurrentUser();
  }

  async refresh(): Promise<AuthTokens> {
    const refreshToken = this.refreshToken;
    if (!refreshToken) {
      throw new Error('No hay refresh token disponible');
    }

    const tokens = await firstValueFrom(
      this.http.post<AuthTokens>(`${API_BASE_URL}/auth/refresh`, { refreshToken }),
    );
    this.storeTokens(tokens);
    return tokens;
  }

  async logout(): Promise<void> {
    const refreshToken = this.refreshToken;
    this.clearSession();

    if (refreshToken) {
      try {
        await firstValueFrom(this.http.post(`${API_BASE_URL}/auth/logout`, { refreshToken }));
      } catch {
        // Si falla la revocación remota, igual cerramos la sesión localmente.
      }
    }
  }

  clearSession(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.accessTokenSignal.set(tokens.accessToken);
  }
}
