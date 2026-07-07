import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import {
  AvailabilityBusyRange,
  AvailabilityWindow,
} from '../../../core/models/scheduling.model';

const MINUTES_IN_DAY = 24 * 60;
const DEFAULT_RANGE_START = 7 * 60;
const DEFAULT_RANGE_END = 21 * 60;
const SNAP_MINUTES = 5;

interface VisualSegment {
  leftPct: number;
  widthPct: number;
}

interface VisualBusyRange extends VisualSegment {
  label: string;
  timeRangeLabel: string;
}

interface VisualHourMark {
  leftPct: number;
  label: string;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function isoToMinutesOfDay(iso: string): number {
  const date = new Date(iso);
  return date.getUTCHours() * 60 + date.getUTCMinutes();
}

function formatMinutes(minutes: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY - 1, minutes));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

@Component({
  selector: 'app-availability-timeline',
  standalone: true,
  templateUrl: './availability-timeline.component.html',
  styleUrl: './availability-timeline.component.scss',
})
export class AvailabilityTimelineComponent {
  private readonly schedulesSignal = signal<AvailabilityWindow[]>([]);
  private readonly busySignal = signal<AvailabilityBusyRange[]>([]);
  private readonly durationMinutesSignal = signal(30);
  private readonly selectedTimeSignal = signal<string | null>(null);
  private readonly isHolidaySignal = signal(false);
  private readonly loadingSignal = signal(false);

  @Input() set schedules(value: AvailabilityWindow[] | null | undefined) {
    this.schedulesSignal.set(value ?? []);
  }

  @Input() set busy(value: AvailabilityBusyRange[] | null | undefined) {
    this.busySignal.set(value ?? []);
  }

  @Input() set durationMinutes(value: number | null | undefined) {
    this.durationMinutesSignal.set(value && value > 0 ? value : 30);
  }

  @Input() set selectedTime(value: string | null | undefined) {
    this.selectedTimeSignal.set(value ?? null);
  }

  @Input() set isHoliday(value: boolean | null | undefined) {
    this.isHolidaySignal.set(!!value);
  }

  @Input() set loading(value: boolean | null | undefined) {
    this.loadingSignal.set(!!value);
  }

  @Output() readonly timeSelected = new EventEmitter<string>();

  protected readonly isHolidayState = this.isHolidaySignal.asReadonly();
  protected readonly loadingState = this.loadingSignal.asReadonly();

  protected readonly hasSchedule = computed(() => this.schedulesSignal().length > 0);

  private readonly range = computed(() => {
    const schedules = this.schedulesSignal();
    let start = DEFAULT_RANGE_START;
    let end = DEFAULT_RANGE_END;
    for (const window of schedules) {
      start = Math.min(start, toMinutes(window.startsAt));
      end = Math.max(end, toMinutes(window.endsAt));
    }
    return { start, end };
  });

  protected readonly hourMarks = computed<VisualHourMark[]>(() => {
    const { start, end } = this.range();
    const marks: VisualHourMark[] = [];
    const firstHour = Math.ceil(start / 60) * 60;
    for (let minutes = firstHour; minutes <= end; minutes += 60) {
      marks.push({
        leftPct: this.toPercent(minutes),
        label: formatMinutes(minutes).slice(0, 2) + 'h',
      });
    }
    return marks;
  });

  protected readonly openSegments = computed<VisualSegment[]>(() =>
    this.schedulesSignal().map((window) => ({
      leftPct: this.toPercent(toMinutes(window.startsAt)),
      widthPct: this.toWidthPercent(toMinutes(window.startsAt), toMinutes(window.endsAt)),
    })),
  );

  protected readonly busySegments = computed<VisualBusyRange[]>(() =>
    this.busySignal().map((range) => {
      const startMinutes = isoToMinutesOfDay(range.startAt);
      const endMinutes = isoToMinutesOfDay(range.endAt);
      return {
        leftPct: this.toPercent(startMinutes),
        widthPct: this.toWidthPercent(startMinutes, endMinutes),
        label: range.label,
        timeRangeLabel: `${formatMinutes(startMinutes)} – ${formatMinutes(endMinutes)}`,
      };
    }),
  );

  protected readonly selectionSegment = computed<VisualSegment | null>(() => {
    const selected = this.selectedTimeSignal();
    if (!selected) {
      return null;
    }
    const startMinutes = toMinutes(selected);
    const endMinutes = startMinutes + this.durationMinutesSignal();
    return {
      leftPct: this.toPercent(startMinutes),
      widthPct: this.toWidthPercent(startMinutes, endMinutes),
    };
  });

  protected readonly selectedTimeLabel = computed(() => this.selectedTimeSignal());

  onTrackClick(event: MouseEvent, track: HTMLElement): void {
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const { start, end } = this.range();
    const rawMinutes = start + fraction * (end - start);
    const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    this.timeSelected.emit(formatMinutes(snapped));
  }

  /** Navegación por teclado: ← → mueven la selección en pasos de 5 minutos, dentro del rango visible. */
  onTrackKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    event.preventDefault();

    const { start, end } = this.range();
    const current = this.selectedTimeSignal();
    const currentMinutes = current ? toMinutes(current) : start;
    const delta = event.key === 'ArrowRight' ? SNAP_MINUTES : -SNAP_MINUTES;
    const next = Math.min(end, Math.max(start, currentMinutes + delta));
    this.timeSelected.emit(formatMinutes(next));
  }

  private toPercent(minutes: number): number {
    const { start, end } = this.range();
    return ((minutes - start) / (end - start)) * 100;
  }

  private toWidthPercent(startMinutes: number, endMinutes: number): number {
    const { start, end } = this.range();
    return ((endMinutes - startMinutes) / (end - start)) * 100;
  }
}
