import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const THEME_KEY = 'atlas.theme';

/**
 * Modo claro/oscuro. Por defecto sigue la preferencia del sistema operativo
 * (`prefers-color-scheme`); en cuanto el usuario alterna el switch una vez,
 * su elección se recuerda explícitamente en localStorage y ya no vuelve a
 * seguir al sistema.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSignal = signal<Theme>(this.resolveInitialTheme());
  readonly theme = this.themeSignal.asReadonly();

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.themeSignal());
    });
  }

  toggle(): void {
    this.set(this.themeSignal() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.themeSignal.set(theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  private resolveInitialTheme(): Theme {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }

    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}
