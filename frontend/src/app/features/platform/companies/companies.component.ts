import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PlatformService } from '../../../core/services/platform.service';
import { Company } from '../../../core/models/platform.model';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [FormsModule, AppShellComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss',
})
export class CompaniesComponent implements OnInit {
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly companies = signal<Company[]>([]);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected newCompanyName = '';

  protected readonly creatingAdminFor = signal<number | null>(null);
  protected newAdminEmail = '';
  protected newAdminPassword = '';

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  protected get currentUserEmail(): string | undefined {
    return this.authService.currentUser()?.email;
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    try {
      this.companies.set(await this.platformService.listCompanies());
    } finally {
      this.loading.set(false);
    }
  }

  async createCompany(): Promise<void> {
    if (!this.newCompanyName.trim()) {
      return;
    }

    await this.platformService.createCompany(this.newCompanyName.trim());
    this.newCompanyName = '';
    await this.reload();
  }

  async impersonate(company: Company): Promise<void> {
    const reason = window.prompt(`Motivo para entrar como Business Admin de "${company.name}":`);
    if (!reason || !reason.trim()) {
      return;
    }

    this.errorMessage.set(null);
    try {
      const tokens = await this.platformService.impersonate(company.id, reason.trim());
      await this.authService.beginImpersonation(tokens);
      await this.router.navigateByUrl('/settings/company');
    } catch {
      this.errorMessage.set('No se pudo impersonar la empresa.');
    }
  }

  startCreatingAdmin(company: Company): void {
    this.errorMessage.set(null);
    this.newAdminEmail = '';
    this.newAdminPassword = '';
    this.creatingAdminFor.set(company.id);
  }

  cancelCreatingAdmin(): void {
    this.creatingAdminFor.set(null);
  }

  async createAdmin(company: Company): Promise<void> {
    if (!this.newAdminEmail.trim() || !this.newAdminPassword.trim()) {
      return;
    }

    this.errorMessage.set(null);
    try {
      await this.platformService.createBusinessAdmin(
        company.id,
        this.newAdminEmail.trim(),
        this.newAdminPassword,
      );
      this.cancelCreatingAdmin();
    } catch {
      this.errorMessage.set(
        'No se pudo crear el Business Admin. Verifica que el correo no esté en uso.',
      );
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
