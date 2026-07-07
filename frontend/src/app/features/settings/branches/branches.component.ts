import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { Branch, OpeningHour } from '../../../core/models/settings.model';
import { scrollToId } from '../../../core/utils/scroll';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

@Component({
  selector: 'app-branches',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, AppShellComponent],
  templateUrl: './branches.component.html',
  styleUrl: './branches.component.scss',
})
export class BranchesComponent implements OnInit {
  private readonly settingsService = inject(SettingsService);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  protected readonly dayNames = DAY_NAMES;
  protected readonly branches = signal<Branch[]>([]);
  protected readonly loading = signal(true);
  protected readonly editingScheduleFor = signal<number | null>(null);
  protected readonly draftSchedule = signal<OpeningHour[]>([]);

  protected newBranchName = '';
  protected newBranchAddress = '';
  protected readonly formError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    this.branches.set(await this.settingsService.listBranches());
    this.loading.set(false);
  }

  async createBranch(): Promise<void> {
    if (!this.newBranchName.trim()) {
      this.formError.set('Escribe un nombre para la sucursal.');
      scrollToId('branch-form-error');
      return;
    }

    this.formError.set(null);
    const created = await this.settingsService.createBranch(
      this.newBranchName.trim(),
      this.newBranchAddress.trim() || undefined,
    );
    this.newBranchName = '';
    this.newBranchAddress = '';
    await this.reload();
    scrollToId(`branch-card-${created.id}`);
  }

  editSchedule(branch: Branch): void {
    this.editingScheduleFor.set(branch.id);
    this.draftSchedule.set(branch.openingHours ? [...branch.openingHours] : []);
    scrollToId(`branch-schedule-editor-${branch.id}`);
  }

  cancelSchedule(): void {
    this.editingScheduleFor.set(null);
    this.draftSchedule.set([]);
  }

  addScheduleRow(): void {
    this.draftSchedule.set([
      ...this.draftSchedule(),
      { dayOfWeek: 1, opensAt: '09:00', closesAt: '18:00' },
    ]);
  }

  removeScheduleRow(index: number): void {
    this.draftSchedule.set(this.draftSchedule().filter((_, i) => i !== index));
  }

  updateScheduleRow(index: number, field: keyof OpeningHour, value: string): void {
    const next = [...this.draftSchedule()];
    next[index] = { ...next[index], [field]: field === 'dayOfWeek' ? Number(value) : value };
    this.draftSchedule.set(next);
  }

  async saveSchedule(): Promise<void> {
    const branchId = this.editingScheduleFor();
    if (branchId === null) {
      return;
    }

    await this.settingsService.setBranchSchedule(branchId, this.draftSchedule());
    this.cancelSchedule();
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
