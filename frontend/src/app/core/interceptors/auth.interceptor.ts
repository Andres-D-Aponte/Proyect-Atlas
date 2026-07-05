import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

const PUBLIC_PATHS = ['/auth/login', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const isPublic = PUBLIC_PATHS.some((path) => req.url.includes(path));

  const token = authService.accessToken;
  const authorizedReq = token && !isPublic ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorizedReq).pipe(
    catchError((error: unknown) => {
      const isUnauthorized = error instanceof HttpErrorResponse && error.status === 401;
      if (!isUnauthorized || isPublic) {
        return throwError(() => error);
      }

      // Un único intento de refresh + reintento; si también falla, se cierra la sesión.
      return from(authService.refresh()).pipe(
        switchMap((tokens) => {
          const retriedReq = req.clone({
            setHeaders: { Authorization: `Bearer ${tokens.accessToken}` },
          });
          return next(retriedReq);
        }),
        catchError((refreshError: unknown) => {
          authService.clearSession();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
