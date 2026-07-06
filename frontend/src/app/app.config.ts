import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorNotificationInterceptor } from './core/interceptors/error-notification.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // errorNotificationInterceptor va primero para quedar como la capa más
    // externa (ver comentario en el propio archivo del interceptor).
    provideHttpClient(withInterceptors([errorNotificationInterceptor, authInterceptor])),
  ],
};
