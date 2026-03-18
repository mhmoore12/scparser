import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatCalendar, MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { ScheduleSession } from '../../models/schedule.models';

@Component({
  selector: 'app-schedule-calendar',
  imports: [DatePipe, MatCardModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule],
  templateUrl: './schedule-calendar.component.html',
  styleUrl: './schedule-calendar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleCalendarComponent implements OnChanges {
  @ViewChild(MatCalendar) private calendar?: MatCalendar<Date>;

  @Input() sessions: ScheduleSession[] = [];
  @Input() startDate = '';
  @Input() endDate = '';
  @Output() readonly dateRangeChange = new EventEmitter<{ startDate: string; endDate: string }>();
  private pendingRangeStart = '';

  get selectedDateValue(): Date | null {
    if (!this.startDate) {
      return null;
    }
    const date = new Date(`${this.startDate}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  readonly dateClass = (date: Date): string => {
    const iso = this.toIsoDate(date);
    const classes: string[] = [];

    if (this.sessions.some((session) => session.start?.startsWith(iso))) {
      classes.push('has-session-day');
    }

    if (this.startDate && this.endDate && iso >= this.startDate && iso <= this.endDate) {
      classes.push('in-selected-range');
    }
    if (this.startDate && iso === this.startDate) {
      classes.push('range-start');
    }
    if (this.endDate && iso === this.endDate) {
      classes.push('range-end');
    }
    if (this.pendingRangeStart && iso === this.pendingRangeStart) {
      classes.push('pending-range-start');
    }

    return classes.join(' ');
  };

  get selectedDateSessions(): ScheduleSession[] {
    if (!this.startDate || !this.endDate) {
      return [];
    }
    return this.sessions
      .filter((session) => {
        const sessionDate = session.start?.slice(0, 10) ?? '';
        return sessionDate >= this.startDate && sessionDate <= this.endDate;
      })
      .sort((a, b) => Date.parse(a.start ?? '') - Date.parse(b.start ?? ''));
  }

  onDateChange(value: Date | null): void {
    if (!value) {
      this.pendingRangeStart = '';
      this.dateRangeChange.emit({ startDate: '', endDate: '' });
      return;
    }

    const clicked = this.toIsoDate(value);
    if (!this.pendingRangeStart) {
      this.pendingRangeStart = clicked;
      this.dateRangeChange.emit({ startDate: clicked, endDate: clicked });
      return;
    }

    if (clicked < this.pendingRangeStart) {
      this.dateRangeChange.emit({ startDate: clicked, endDate: this.pendingRangeStart });
    } else {
      this.dateRangeChange.emit({ startDate: this.pendingRangeStart, endDate: clicked });
    }
    this.pendingRangeStart = '';
  }

  clearDate(): void {
    this.pendingRangeStart = '';
    this.dateRangeChange.emit({ startDate: '', endDate: '' });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['startDate'] || changes['endDate']) {
      if (this.startDate && this.endDate && this.startDate === this.endDate) {
        this.pendingRangeStart = this.startDate;
      } else {
        this.pendingRangeStart = '';
      }

      // Force Material calendar cell class recomputation when external filters update.
      queueMicrotask(() => this.calendar?.updateTodaysDate());
    }
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
