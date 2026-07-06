import { Injectable, signal } from '@angular/core';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

const AUTO_DISMISS_MS: Record<ToastType, number> = {
  error: 8000,
  success: 4000,
  info: 5000,
};

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toastsSignal = signal<Toast[]>([]);
  private nextId = 1;

  readonly toasts = this.toastsSignal.asReadonly();

  error(message: string): void {
    this.push('error', message);
  }

  success(message: string): void {
    this.push('success', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.toastsSignal.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private push(type: ToastType, message: string): void {
    const id = this.nextId++;
    this.toastsSignal.update((toasts) => [...toasts, { id, type, message }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS[type]);
  }
}
