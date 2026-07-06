import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

interface NestErrorBody {
  message?: string | string[];
}

/**
 * Muestra en un toast cualquier error que devuelva el backend (validaciones de
 * class-validator, conflictos, permisos, etc.) para que ningún error quede
 * silencioso en consola. Debe registrarse ANTES que `authInterceptor` en
 * `app.config.ts`: así queda como la capa más externa y solo ve el error
 * final, después de que `authInterceptor` ya intentó su refresh silencioso
 * en un 401 — evita mostrar un toast por una renovación de sesión que
 * termina resolviéndose sola.
 */
export const errorNotificationInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: unknown) => {
      notificationService.error(extractMessage(error));
      return throwError(() => error);
    }),
  );
};

function extractMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.';
    }

    const body = error.error as NestErrorBody | undefined;
    if (body?.message) {
      return Array.isArray(body.message) ? body.message.join('\n') : body.message;
    }
  }

  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
