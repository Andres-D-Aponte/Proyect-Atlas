import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [ThemeToggleComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  @Input() title = '';
  @Input() subtitle?: string;
  @Input() userEmail: string | null = null;
  @Input() showLogout = false;
  @Output() logout = new EventEmitter<void>();
}
