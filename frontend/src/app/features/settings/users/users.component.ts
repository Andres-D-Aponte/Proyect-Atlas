import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Role } from '../../../core/models/auth.model';
import { ASSIGNABLE_ROLE_OPTIONS, CompanyUser, ROLE_LABELS } from '../../../core/models/users.model';
import { AuthService } from '../../../core/services/auth.service';
import { UsersService } from '../../../core/services/users.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, AppShellComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  protected readonly assignableRoles = ASSIGNABLE_ROLE_OPTIONS;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly users = signal<CompanyUser[]>([]);
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected newEmail = '';
  protected newPassword = '';
  protected newRole: Role = 'RECEPTIONIST_CASHIER';

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    this.users.set(await this.usersService.list());
    this.loading.set(false);
  }

  async createUser(): Promise<void> {
    if (!this.newEmail.trim() || !this.newPassword.trim()) {
      return;
    }

    this.errorMessage.set(null);
    this.creating.set(true);
    try {
      await this.usersService.create({
        email: this.newEmail.trim(),
        password: this.newPassword,
        role: this.newRole,
      });
      this.newEmail = '';
      this.newPassword = '';
      await this.reload();
    } catch {
      this.errorMessage.set('No se pudo crear el usuario. Verifica que el correo no esté en uso.');
    } finally {
      this.creating.set(false);
    }
  }

  async toggleActive(user: CompanyUser): Promise<void> {
    await this.usersService.setActive(user.id, !user.isActive);
    await this.reload();
  }

  async exitImpersonation(): Promise<void> {
    await this.authService.exitImpersonation();
    await this.router.navigateByUrl('/platform/companies');
  }
}
