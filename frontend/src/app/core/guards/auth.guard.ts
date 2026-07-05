import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.parseUrl('/login');
  }

  if (!authService.currentUser()) {
    try {
      await authService.loadCurrentUser();
    } catch {
      authService.clearSession();
      return router.parseUrl('/login');
    }
  }

  return true;
};
