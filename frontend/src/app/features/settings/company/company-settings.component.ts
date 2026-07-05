import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ALL_PAYMENT_METHODS, PaymentMethod } from '../../../core/models/settings.model';

@Component({
  selector: 'app-company-settings',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, RouterLinkActive],
  templateUrl: './company-settings.component.html',
  styleUrl: './company-settings.component.scss',
})
export class CompanySettingsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly settingsService = inject(SettingsService);
  protected readonly authService = inject(AuthService);

  protected readonly allPaymentMethods = ALL_PAYMENT_METHODS;
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly savedMessage = signal<string | null>(null);
  protected companyName = '';

  protected readonly form = this.formBuilder.group({
    logoUrl: [''],
    primaryColor: ['#1A2B3C'],
    timezone: ['America/Bogota'],
    currency: ['COP'],
    language: ['es'],
  });

  protected readonly selectedPaymentMethods = signal<Set<PaymentMethod>>(new Set());

  async ngOnInit(): Promise<void> {
    const settings = await this.settingsService.getCompanySettings();
    this.companyName = settings.name;
    this.form.patchValue({
      logoUrl: settings.logoUrl ?? '',
      primaryColor: settings.primaryColor ?? '#1A2B3C',
      timezone: settings.timezone,
      currency: settings.currency,
      language: settings.language,
    });
    this.selectedPaymentMethods.set(new Set(settings.enabledPaymentMethods));
    this.loading.set(false);
  }

  togglePaymentMethod(method: PaymentMethod, checked: boolean): void {
    const next = new Set(this.selectedPaymentMethods());
    if (checked) {
      next.add(method);
    } else {
      next.delete(method);
    }
    this.selectedPaymentMethods.set(next);
  }

  isPaymentMethodEnabled(method: PaymentMethod): boolean {
    return this.selectedPaymentMethods().has(method);
  }

  async save(): Promise<void> {
    this.saving.set(true);
    this.savedMessage.set(null);

    const raw = this.form.getRawValue();
    await this.settingsService.updateCompanySettings({
      logoUrl: raw.logoUrl || undefined,
      primaryColor: raw.primaryColor || undefined,
      timezone: raw.timezone || undefined,
      currency: raw.currency || undefined,
      language: raw.language || undefined,
      enabledPaymentMethods: Array.from(this.selectedPaymentMethods()),
    });

    this.saving.set(false);
    this.savedMessage.set('Cambios guardados.');
  }
}
