import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ClientsService } from '../../core/services/clients.service';
import { CatalogService } from '../../core/services/catalog.service';
import { SchedulingService } from '../../core/services/scheduling.service';
import { SettingsService } from '../../core/services/settings.service';
import { Client } from '../../core/models/clients.model';
import { Service } from '../../core/models/catalog.model';
import { Branch } from '../../core/models/settings.model';
import {
  Appointment,
  AppointmentDraft,
  AppointmentStatus,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_OPTIONS,
  Professional,
  Waitlist,
  WAITLIST_STATUS_LABELS,
  emptyAppointmentDraft,
} from '../../core/models/scheduling.model';
import { scrollToId } from '../../core/utils/scroll';
import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, RouterLinkActive, AppShellComponent],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
})
export class AgendaComponent implements OnInit {
  private readonly schedulingService = inject(SchedulingService);
  private readonly settingsService = inject(SettingsService);
  private readonly catalogService = inject(CatalogService);
  private readonly clientsService = inject(ClientsService);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  protected readonly statusLabels = APPOINTMENT_STATUS_LABELS;
  protected readonly statusOptions = APPOINTMENT_STATUS_OPTIONS;
  protected readonly waitlistStatusLabels = WAITLIST_STATUS_LABELS;

  protected readonly appointments = signal<Appointment[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly services = signal<Service[]>([]);
  protected readonly professionals = signal<Professional[]>([]);
  protected readonly clients = signal<Client[]>([]);
  protected readonly waitlist = signal<Waitlist[]>([]);
  protected readonly loading = signal(true);

  protected filterBranchId: number | null = null;
  protected filterStatus: AppointmentStatus | '' = '';

  protected draft: AppointmentDraft = emptyAppointmentDraft();
  protected readonly formError = signal<string | null>(null);

  protected readonly expandedAppointmentId = signal<number | null>(null);

  protected readonly showWaitlistForm = signal(false);
  protected waitlistBranchId: number | null = null;
  protected waitlistClientId: number | null = null;
  protected waitlistServiceId: number | null = null;
  protected waitlistProfessionalId: number | null = null;
  protected readonly waitlistFormError = signal<string | null>(null);

  protected readonly selectedService = computed(
    () => this.services().find((s) => s.id === this.draft.serviceId) ?? null,
  );

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    const [appointments, branches, services, professionals, clients, waitlist] =
      await Promise.all([
        this.schedulingService.listAppointments({
          branchId: this.filterBranchId ?? undefined,
          status: this.filterStatus || undefined,
        }),
        this.settingsService.listBranches(),
        this.catalogService.listServices(),
        this.schedulingService.listProfessionals(),
        this.clientsService.list(),
        this.schedulingService.listWaitlist(),
      ]);
    this.appointments.set(appointments);
    this.branches.set(branches);
    this.services.set(services);
    this.professionals.set(professionals);
    this.clients.set(clients);
    this.waitlist.set(waitlist);
    this.loading.set(false);
  }

  async applyFilters(): Promise<void> {
    await this.reload();
  }

  branchName(branchId: number): string {
    return this.branches().find((b) => b.id === branchId)?.name ?? `Sucursal ${branchId}`;
  }

  async createAppointment(): Promise<void> {
    const missing: string[] = [];
    if (!this.draft.branchId) missing.push('la sucursal');
    if (!this.draft.serviceId) missing.push('el servicio');
    if (!this.draft.professionalId) missing.push('el profesional');
    if (this.selectedService()?.requiresTwoProfessionals && !this.draft.secondProfessionalId) {
      missing.push('el segundo profesional (este servicio lo requiere)');
    }
    if (!this.draft.startAt) missing.push('la fecha y hora');

    if (missing.length > 0) {
      this.formError.set(`Falta completar ${missing.join(', ')} para agendar la cita.`);
      scrollToId('appointment-form-error');
      return;
    }

    this.formError.set(null);
    try {
      const created = await this.schedulingService.createAppointment({
        ...this.draft,
        startAt: new Date(this.draft.startAt).toISOString(),
      });
      this.draft = emptyAppointmentDraft();
      await this.reload();
      scrollToId(`appointment-row-${created.id}`);
    } catch {
      // El interceptor global ya mostró el toast con el motivo del error.
    }
  }

  async changeStatus(appointment: Appointment, status: AppointmentStatus): Promise<void> {
    try {
      await this.schedulingService.setAppointmentStatus(appointment.id, status);
      await this.reload();
    } catch {
      // El interceptor global ya mostró el toast con el motivo del error.
    }
  }

  async toggleHistory(appointment: Appointment): Promise<void> {
    if (this.expandedAppointmentId() === appointment.id) {
      this.expandedAppointmentId.set(null);
      return;
    }

    const detail = await this.schedulingService.getAppointment(appointment.id);
    this.appointments.set(
      this.appointments().map((a) => (a.id === appointment.id ? detail : a)),
    );
    this.expandedAppointmentId.set(appointment.id);
    scrollToId(`appointment-history-${appointment.id}`);
  }

  openWaitlistForm(): void {
    this.showWaitlistForm.set(true);
    this.waitlistBranchId = null;
    this.waitlistClientId = null;
    this.waitlistServiceId = null;
    this.waitlistProfessionalId = null;
    this.waitlistFormError.set(null);
    scrollToId('waitlist-form');
  }

  cancelWaitlistForm(): void {
    this.showWaitlistForm.set(false);
  }

  async createWaitlistEntry(): Promise<void> {
    const missing: string[] = [];
    if (!this.waitlistBranchId) missing.push('la sucursal');
    if (!this.waitlistClientId) missing.push('el cliente');
    if (!this.waitlistServiceId) missing.push('el servicio');

    if (missing.length > 0) {
      this.waitlistFormError.set(`Falta completar ${missing.join(', ')} para la lista de espera.`);
      scrollToId('waitlist-form-error');
      return;
    }

    this.waitlistFormError.set(null);
    const created = await this.schedulingService.createWaitlistEntry({
      branchId: this.waitlistBranchId!,
      clientId: this.waitlistClientId!,
      serviceId: this.waitlistServiceId!,
      professionalId: this.waitlistProfessionalId ?? undefined,
    });
    this.showWaitlistForm.set(false);
    await this.reload();
    scrollToId(`waitlist-row-${created.id}`);
  }

  async cancelWaitlistEntry(entry: Waitlist): Promise<void> {
    await this.schedulingService.cancelWaitlistEntry(entry.id);
    await this.reload();
  }

  async exitImpersonation(): Promise<void> {
    await this.authService.exitImpersonation();
    await this.router.navigateByUrl('/platform/companies');
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigateByUrl('/login');
  }
}
