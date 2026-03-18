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
import { applySessionFilters, collectRinks, DEFAULT_FILTERS } from '../../utils/schedule-filter.util';

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
          if (!this.filters().date) {
            this.updateFilters({ ...this.filters(), date: this.todayIsoDate() });
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
    this.updateFilters({ ...DEFAULT_FILTERS, date: this.todayIsoDate() });
  }

  setCalendarDate(date: string): void {
    this.filters.set({ ...this.filters(), date });
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
        return { ...DEFAULT_FILTERS, date: this.todayIsoDate() };
      }
      const parsed = JSON.parse(raw) as Partial<SessionFilters>;
      const today = this.todayIsoDate();
      const parsedDate =
        typeof parsed.date === 'string' && parsed.date ? parsed.date : today;
      const normalizedDate = parsedDate < today ? today : parsedDate;
      return {
        query: typeof parsed.query === 'string' ? parsed.query : '',
        rinks: Array.isArray(parsed.rinks) ? parsed.rinks.filter((v) => typeof v === 'string') : [],
        date: normalizedDate,
        availableOnly: Boolean(parsed.availableOnly),
      };
    } catch {
      return { ...DEFAULT_FILTERS, date: this.todayIsoDate() };
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
