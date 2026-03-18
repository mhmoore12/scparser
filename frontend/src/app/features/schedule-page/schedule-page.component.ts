import { ChangeDetectionStrategy, Component, computed, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { take } from 'rxjs';
import { LoadingStateComponent } from '../../components/loading-state/loading-state.component';
import { ScheduleFiltersComponent } from '../../components/schedule-filters/schedule-filters.component';
import { ScheduleCalendarComponent } from '../../components/schedule-calendar/schedule-calendar.component';
import { SessionCardComponent } from '../../components/session-card/session-card.component';
import { SchedulePayload, ScheduleSession, SessionFilters } from '../../models/schedule.models';
import { ScheduleDataService } from '../../services/schedule-data.service';
import {
  applySessionFilters,
  collectActivityTypes,
  collectRinks,
  DEFAULT_FILTERS,
} from '../../utils/schedule-filter.util';

@Component({
  selector: 'app-schedule-page',
  imports: [
    DatePipe,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatTabsModule,
    LoadingStateComponent,
    ScheduleFiltersComponent,
    ScheduleCalendarComponent,
    SessionCardComponent,
  ],
  templateUrl: './schedule-page.component.html',
  styleUrl: './schedule-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulePageComponent implements OnInit {
  private static readonly FILTER_STORAGE_KEY = 'scparser.schedule.filters.v1';

  readonly loading = signal(true);
  readonly error = signal('');
  readonly payload = signal<SchedulePayload | null>(null);
  readonly filters = signal<SessionFilters>(this.loadInitialFilters());

  readonly rinks = computed(() => collectRinks(this.payload()?.sessions ?? []));
  readonly activityTypes = computed(() => collectActivityTypes(this.payload()?.sessions ?? []));
  readonly sessions = computed(() => applySessionFilters(this.payload()?.sessions ?? [], this.filters()));
  readonly groupedSessions = computed(() => this.groupByRink(this.sessions()));

  readonly updatedAt = computed(() => this.payload()?.generatedAt ?? null);

  constructor(private readonly scheduleDataService: ScheduleDataService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.error.set('');
    this.scheduleDataService
      .load()
      .pipe(take(1))
      .subscribe({
        next: (payload) => {
          this.payload.set(payload);
          if (!this.filters().startDate || !this.filters().endDate) {
            const today = this.todayIsoDate();
            this.updateFilters({ ...this.filters(), startDate: today, endDate: today });
          }
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Unable to load schedule feed.');
          this.loading.set(false);
        },
      });
  }

  updateFilters(next: SessionFilters): void {
    this.filters.set(next);
    this.persistFilters(next);
  }

  clearFilters(): void {
    const today = this.todayIsoDate();
    this.updateFilters({ ...DEFAULT_FILTERS, startDate: today, endDate: today });
  }

  setCalendarRange(startDate: string, endDate: string): void {
    this.updateFilters({ ...this.filters(), startDate, endDate });
  }

  private groupByRink(sessions: ScheduleSession[]): Array<{ rink: string; sessions: ScheduleSession[] }> {
    const groups = new Map<string, ScheduleSession[]>();
    for (const session of sessions) {
      const rink = session.rinkLocation || 'Unassigned';
      const bucket = groups.get(rink) ?? [];
      bucket.push(session);
      groups.set(rink, bucket);
    }

    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([rink, grouped]) => ({ rink, sessions: grouped }));
  }

  private loadInitialFilters(): SessionFilters {
    try {
      const raw = localStorage.getItem(SchedulePageComponent.FILTER_STORAGE_KEY);
      if (!raw) {
        const today = this.todayIsoDate();
        return { ...DEFAULT_FILTERS, startDate: today, endDate: today };
      }
      const parsed = JSON.parse(raw) as Partial<SessionFilters>;
      const today = this.todayIsoDate();
      const legacyDate = (parsed as { date?: string }).date;
      const rawStart =
        typeof parsed.startDate === 'string'
          ? parsed.startDate
          : typeof legacyDate === 'string'
            ? legacyDate
            : '';
      const rawEnd =
        typeof parsed.endDate === 'string'
          ? parsed.endDate
          : typeof legacyDate === 'string'
            ? legacyDate
            : '';
      const normalizedStart = rawStart && rawStart >= today ? rawStart : today;
      const normalizedEnd = rawEnd && rawEnd >= normalizedStart ? rawEnd : normalizedStart;
      return {
        query: typeof parsed.query === 'string' ? parsed.query : '',
        rinks: Array.isArray(parsed.rinks) ? parsed.rinks.filter((v) => typeof v === 'string') : [],
        activityTypes: Array.isArray(parsed.activityTypes)
          ? parsed.activityTypes.filter((v) => typeof v === 'string')
          : [],
        startDate: normalizedStart,
        endDate: normalizedEnd,
        availableOnly: Boolean(parsed.availableOnly),
      };
    } catch {
      const today = this.todayIsoDate();
      return { ...DEFAULT_FILTERS, startDate: today, endDate: today };
    }
  }

  private persistFilters(filters: SessionFilters): void {
    try {
      localStorage.setItem(SchedulePageComponent.FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore storage quota/private mode failures.
    }
  }

  private todayIsoDate(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
