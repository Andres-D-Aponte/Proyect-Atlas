import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Client,
  ClientTimelineEvent,
  draftFromClient,
  emptyClientDraft,
} from '../../core/models/clients.model';
import { AuthService } from '../../core/services/auth.service';
import { ClientsService } from '../../core/services/clients.service';
import { AppShellComponent } from '../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule, DatePipe, AppShellComponent],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
})
export class ClientsComponent implements OnInit {
  private readonly clientsService = inject(ClientsService);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  protected readonly clients = signal<Client[]>([]);
  protected readonly loading = signal(true);
  protected readonly creating = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected searchTerm = '';

  protected newClient = emptyClientDraft();

  protected readonly editingClientId = signal<number | null>(null);
  protected editingDraft = emptyClientDraft();

  protected readonly viewingTimelineForId = signal<number | null>(null);
  protected readonly timelineEvents = signal<ClientTimelineEvent[]>([]);
  protected readonly loadingTimeline = signal(false);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    this.clients.set(await this.clientsService.list(this.searchTerm.trim() || undefined));
    this.loading.set(false);
  }

  async search(): Promise<void> {
    await this.reload();
  }

  async createClient(): Promise<void> {
    const missing: string[] = [];
    if (!this.newClient.name.trim()) {
      missing.push('el nombre');
    }
    if (!this.newClient.phone.trim()) {
      missing.push('el teléfono');
    }

    if (missing.length > 0) {
      this.formError.set(`Falta completar ${missing.join(' y ')} para crear el cliente.`);
      return;
    }

    this.formError.set(null);
    this.creating.set(true);
    try {
      await this.clientsService.create(this.newClient);
      this.newClient = emptyClientDraft();
      await this.reload();
    } catch {
      // El interceptor global ya mostró el toast con el motivo del error.
    } finally {
      this.creating.set(false);
    }
  }

  startEditing(client: Client): void {
    this.viewingTimelineForId.set(null);
    this.editingClientId.set(client.id);
    this.editingDraft = draftFromClient(client);
  }

  cancelEditing(): void {
    this.editingClientId.set(null);
  }

  async saveClient(client: Client): Promise<void> {
    try {
      await this.clientsService.update(client.id, this.editingDraft);
      this.cancelEditing();
      await this.reload();
    } catch {
      // El interceptor global ya mostró el toast con el motivo del error.
    }
  }

  async toggleTimeline(client: Client): Promise<void> {
    if (this.viewingTimelineForId() === client.id) {
      this.viewingTimelineForId.set(null);
      return;
    }

    this.editingClientId.set(null);
    this.viewingTimelineForId.set(client.id);
    this.loadingTimeline.set(true);
    this.timelineEvents.set(await this.clientsService.getTimeline(client.id));
    this.loadingTimeline.set(false);
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
