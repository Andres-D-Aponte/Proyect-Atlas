import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../api-base-url';
import { AuthTokens, CurrentUser } from '../models/auth.model';

const ACCESS_TOKEN_KEY = 'atlas.accessToken';
const REFRESH_TOKEN_KEY = 'atlas.refreshToken';
const PREVIOUS_ACCESS_TOKEN_KEY = 'atlas.previousAccessToken';
const PREVIOUS_REFRESH_TOKEN_KEY = 'atlas.previousRefreshToken';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly accessTokenSignal = signal<string | null>(
    localStorage.getItem(ACCESS_TOKEN_KEY),
  );
  private readonly currentUserSignal = signal<CurrentUser | null>(null);

  /**
   * Cuando el access token expira, varias peticiones en curso pueden recibir
   * un 401 casi al mismo tiempo (ej. una pantalla que carga dos recursos en
   * paralelo). Sin esto, cada una dispararía su propio `POST /auth/refresh`
   * con el mismo refresh token — y como el backend lo revoca de un solo uso
   * (rotación), la segunda petición fallaría y cerraría la sesión aunque el
   * usuario no haya hecho nada malo. Todas comparten esta única promesa en
   * vuelo en vez de refrescar cada una por su cuenta.
   */
  private refreshInFlight: Promise<AuthTokens> | null = null;

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.accessTokenSignal() !== null);
  readonly isImpersonating = computed(() => this.currentUserSignal()?.impersonatedBy != null);

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

  /** Cambia a la sesión de una empresa impersonada, guardando antes los tokens
   *  del Platform Owner para poder restaurarlos con `exitImpersonation()`. */
  async beginImpersonation(tokens: AuthTokens): Promise<void> {
    const currentAccessToken = this.accessTokenSignal();
    const currentRefreshToken = this.refreshToken;
    if (currentAccessToken && currentRefreshToken) {
      localStorage.setItem(PREVIOUS_ACCESS_TOKEN_KEY, currentAccessToken);
      localStorage.setItem(PREVIOUS_REFRESH_TOKEN_KEY, currentRefreshToken);
    }

    this.storeTokens(tokens);
    await this.loadCurrentUser();
  }

  /** Restaura la sesión del Platform Owner guardada antes de impersonar. */
  async exitImpersonation(): Promise<void> {
    const previousAccessToken = localStorage.getItem(PREVIOUS_ACCESS_TOKEN_KEY);
    const previousRefreshToken = localStorage.getItem(PREVIOUS_REFRESH_TOKEN_KEY);
    localStorage.removeItem(PREVIOUS_ACCESS_TOKEN_KEY);
    localStorage.removeItem(PREVIOUS_REFRESH_TOKEN_KEY);

    if (!previousAccessToken || !previousRefreshToken) {
      this.clearSession();
      return;
    }

    this.storeTokens({ accessToken: previousAccessToken, refreshToken: previousRefreshToken });
    await this.loadCurrentUser();
  }

  async refresh(): Promise<AuthTokens> {
    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.performRefresh();
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  private async performRefresh(): Promise<AuthTokens> {
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
    localStorage.removeItem(PREVIOUS_ACCESS_TOKEN_KEY);
    localStorage.removeItem(PREVIOUS_REFRESH_TOKEN_KEY);
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  private storeTokens(tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    this.accessTokenSignal.set(tokens.accessToken);
  }
}
