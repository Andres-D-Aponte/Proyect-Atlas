import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  // Se inyecta aquí (sin usarse directamente) para que el tema se aplique
  // al arrancar la app, antes de que el usuario navegue a ninguna pantalla.
  private readonly themeService = inject(ThemeService);
}
