import { DatePipe } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SchedulingService } from '../../../core/services/scheduling.service';
import { SettingsService } from '../../../core/services/settings.service';
import { UsersService } from '../../../core/services/users.service';
import { Branch } from '../../../core/models/settings.model';
import { CompanyUser } from '../../../core/models/users.model';
import {
  Professional,
  ProfessionalBlock,
  ProfessionalBlockType,
  ProfessionalSchedule,
  PROFESSIONAL_BLOCK_TYPE_OPTIONS,
} from '../../../core/models/scheduling.model';
import { scrollToId } from '../../../core/utils/scroll';
import { AppShellComponent } from '../../../shared/components/app-shell/app-shell.component';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type DraftScheduleRow = Pick<ProfessionalSchedule, 'branchId' | 'dayOfWeek' | 'startsAt' | 'endsAt'>;

@Component({
  selector: 'app-professionals',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive, AppShellComponent, DatePipe],
  templateUrl: './professionals.component.html',
  styleUrl: './professionals.component.scss',
})
export class ProfessionalsComponent implements OnInit {
  private readonly schedulingService = inject(SchedulingService);
  private readonly settingsService = inject(SettingsService);
  private readonly usersService = inject(UsersService);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);

  protected readonly dayNames = DAY_NAMES;
  protected readonly blockTypeOptions = PROFESSIONAL_BLOCK_TYPE_OPTIONS;

  protected readonly professionals = signal<Professional[]>([]);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly unlinkedProfessionalUsers = signal<CompanyUser[]>([]);
  protected readonly loading = signal(true);

  protected newProfessionalName = '';
  protected newProfessionalUserId: number | null = null;
  protected readonly formError = signal<string | null>(null);

  protected readonly editingScheduleFor = signal<number | null>(null);
  protected readonly draftSchedule = signal<DraftScheduleRow[]>([]);

  protected readonly editingBlocksFor = signal<number | null>(null);
  protected newBlockType: ProfessionalBlockType = 'LUNCH';
  protected newBlockStartAt = '';
  protected newBlockEndAt = '';
  protected newBlockNotes = '';
  protected readonly blockFormError = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  private async reload(): Promise<void> {
    this.loading.set(true);
    const [professionals, branches, users] = await Promise.all([
      this.schedulingService.listProfessionals(),
      this.settingsService.listBranches(),
      this.usersService.list(),
    ]);
    this.professionals.set(professionals);
    this.branches.set(branches);
    const linkedUserIds = new Set(
      professionals.map((p) => p.userId).filter((id): id is number => id !== null),
    );
    this.unlinkedProfessionalUsers.set(
      users.filter((u) => u.role === 'PROFESSIONAL' && !linkedUserIds.has(u.id)),
    );
    this.loading.set(false);
  }

  branchName(branchId: number): string {
    return this.branches().find((b) => b.id === branchId)?.name ?? `Sucursal ${branchId}`;
  }

  async createProfessional(): Promise<void> {
    if (!this.newProfessionalName.trim()) {
      this.formError.set('Escribe un nombre para el profesional.');
      scrollToId('professional-form-error');
      return;
    }

    this.formError.set(null);
    const created = await this.schedulingService.createProfessional({
      name: this.newProfessionalName.trim(),
      userId: this.newProfessionalUserId,
    });
    this.newProfessionalName = '';
    this.newProfessionalUserId = null;
    await this.reload();
    scrollToId(`professional-row-${created.id}`);
  }

  editSchedule(professional: Professional): void {
    this.editingBlocksFor.set(null);
    this.editingScheduleFor.set(professional.id);
    this.draftSchedule.set(
      (professional.schedules ?? []).map((row) => ({
        branchId: row.branchId,
        dayOfWeek: row.dayOfWeek,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      })),
    );
    scrollToId(`professional-schedule-editor-${professional.id}`);
  }

  cancelSchedule(): void {
    this.editingScheduleFor.set(null);
    this.draftSchedule.set([]);
  }

  addScheduleRow(): void {
    const firstBranch = this.branches()[0];
    this.draftSchedule.set([
      ...this.draftSchedule(),
      { branchId: firstBranch?.id ?? 0, dayOfWeek: 1, startsAt: '09:00', endsAt: '18:00' },
    ]);
  }

  removeScheduleRow(index: number): void {
    this.draftSchedule.set(this.draftSchedule().filter((_, i) => i !== index));
  }

  updateScheduleRow(index: number, field: keyof DraftScheduleRow, value: string): void {
    const next = [...this.draftSchedule()];
    const numericField = field === 'branchId' || field === 'dayOfWeek';
    next[index] = { ...next[index], [field]: numericField ? Number(value) : value };
    this.draftSchedule.set(next);
  }

  async saveSchedule(): Promise<void> {
    const professionalId = this.editingScheduleFor();
    if (professionalId === null) {
      return;
    }

    await this.schedulingService.setProfessionalSchedule(professionalId, this.draftSchedule());
    this.cancelSchedule();
    await this.reload();
  }

  editBlocks(professional: Professional): void {
    this.editingScheduleFor.set(null);
    this.editingBlocksFor.set(professional.id);
    this.newBlockType = 'LUNCH';
    this.newBlockStartAt = '';
    this.newBlockEndAt = '';
    this.newBlockNotes = '';
    this.blockFormError.set(null);
    scrollToId(`professional-blocks-editor-${professional.id}`);
  }

  cancelBlocks(): void {
    this.editingBlocksFor.set(null);
  }

  async createBlock(professional: Professional): Promise<void> {
    if (!this.newBlockStartAt || !this.newBlockEndAt) {
      this.blockFormError.set('Indica fecha/hora de inicio y de fin para el bloqueo.');
      scrollToId(`professional-blocks-error-${professional.id}`);
      return;
    }

    this.blockFormError.set(null);
    await this.schedulingService.createProfessionalBlock(professional.id, {
      type: this.newBlockType,
      startAt: new Date(this.newBlockStartAt).toISOString(),
      endAt: new Date(this.newBlockEndAt).toISOString(),
      notes: this.newBlockNotes.trim() || undefined,
    });
    this.newBlockStartAt = '';
    this.newBlockEndAt = '';
    this.newBlockNotes = '';
    await this.reload();
    scrollToId(`professional-blocks-editor-${professional.id}`);
  }

  async removeBlock(professional: Professional, block: ProfessionalBlock): Promise<void> {
    await this.schedulingService.removeProfessionalBlock(professional.id, block.id);
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
