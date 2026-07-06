import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  CommissionType,
  RESOURCE_TYPE_OPTIONS,
  Service,
  ServiceCategory,
  ServiceDraft,
  draftFromService,
  emptyServiceDraft,
} from '../../../core/models/catalog.model';
import { AuthService } from '../../../core/services/auth.service';
import { CatalogService } from '../../../core/services/catalog.service';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, AppShellComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss',
})
export class ServicesComponent implements OnInit {
  private readonly catalogService = inject(CatalogService);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  protected readonly resourceTypeOptions = RESOURCE_TYPE_OPTIONS;

  protected readonly categories = signal<ServiceCategory[]>([]);
  protected readonly services = signal<Service[]>([]);
  protected readonly loading = signal(true);

  protected newCategoryName = '';
  protected readonly editingCategoryId = signal<number | null>(null);
  protected editingCategoryName = '';

  protected readonly creatingService = signal(false);
  protected newService = emptyServiceDraft();

  protected readonly editingServiceId = signal<number | null>(null);
  protected editingServiceDraft = emptyServiceDraft();

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    const [categories, services] = await Promise.all([
      this.catalogService.listCategories(),
      this.catalogService.listServices(),
    ]);
    this.categories.set(categories);
    this.services.set(services);
    this.loading.set(false);
  }

  /** Muestra en vivo la equivalencia entre % y valor fijo, dado el precio actual del borrador. */
  commissionEquivalentLabel(draft: ServiceDraft): string {
    if (!draft.price || !draft.commissionValue) {
      return '';
    }

    if (draft.commissionType === 'PERCENTAGE') {
      const fixed = Math.round(draft.price * (draft.commissionValue / 100));
      return `≈ ${fixed.toLocaleString('es-CO')} fijo`;
    }

    const percentage = (draft.commissionValue / draft.price) * 100;
    return `≈ ${percentage.toFixed(1)}%`;
  }

  setCommissionType(draft: ServiceDraft, type: CommissionType): void {
    draft.commissionType = type;
  }

  // ---------- Categorías ----------

  async createCategory(): Promise<void> {
    if (!this.newCategoryName.trim()) {
      return;
    }

    try {
      await this.catalogService.createCategory(this.newCategoryName.trim());
      this.newCategoryName = '';
      await this.reload();
    } catch {
      // El interceptor global ya mostró el toast con el motivo del error.
    }
  }

  startEditingCategory(category: ServiceCategory): void {
    this.editingCategoryId.set(category.id);
    this.editingCategoryName = category.name;
  }

  cancelEditingCategory(): void {
    this.editingCategoryId.set(null);
  }

  async saveCategory(category: ServiceCategory): Promise<void> {
    if (!this.editingCategoryName.trim()) {
      return;
    }

    try {
      await this.catalogService.renameCategory(category.id, this.editingCategoryName.trim());
      this.cancelEditingCategory();
      await this.reload();
    } catch {
      // El interceptor global ya mostró el toast con el motivo del error.
    }
  }

  async deleteCategory(category: ServiceCategory): Promise<void> {
    await this.catalogService.deleteCategory(category.id);
    await this.reload();
  }

  // ---------- Servicios ----------

  async createService(): Promise<void> {
    if (!this.newService.name.trim() || this.newService.durationMinutes <= 0) {
      return;
    }

    this.creatingService.set(true);
    try {
      await this.catalogService.createService(this.newService);
      this.newService = emptyServiceDraft();
      await this.reload();
    } catch {
      // El interceptor global ya mostró el toast con el motivo del error.
    } finally {
      this.creatingService.set(false);
    }
  }

  startEditingService(service: Service): void {
    this.editingServiceId.set(service.id);
    this.editingServiceDraft = draftFromService(service);
  }

  cancelEditingService(): void {
    this.editingServiceId.set(null);
  }

  async saveService(service: Service): Promise<void> {
    try {
      await this.catalogService.updateService(service.id, this.editingServiceDraft);
      this.cancelEditingService();
      await this.reload();
    } catch {
      // El interceptor global ya mostró el toast con el motivo del error.
    }
  }

  async toggleActive(service: Service): Promise<void> {
    await this.catalogService.setActive(service.id, !service.isActive);
    await this.reload();
  }

  async exitImpersonation(): Promise<void> {
    await this.authService.exitImpersonation();
    await this.router.navigateByUrl('/platform/companies');
  }
}
