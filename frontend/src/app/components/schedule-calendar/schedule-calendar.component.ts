import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
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
export class ScheduleCalendarComponent {
  @Input() sessions: ScheduleSession[] = [];
  @Input() selectedDate = '';
  @Output() readonly selectedDateChange = new EventEmitter<string>();

  get selectedDateValue(): Date | null {
    if (!this.selectedDate) {
      return null;
    }
    const date = new Date(`${this.selectedDate}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  readonly dateClass = (date: Date): string => {
    const iso = this.toIsoDate(date);
    return this.sessions.some((session) => session.start?.startsWith(iso)) ? 'has-session-day' : '';
  };

  get selectedDateSessions(): ScheduleSession[] {
    if (!this.selectedDate) {
      return [];
    }
    return this.sessions
      .filter((session) => session.start?.startsWith(this.selectedDate))
      .sort((a, b) => Date.parse(a.start ?? '') - Date.parse(b.start ?? ''));
  }

  onDateChange(value: Date | null): void {
    this.selectedDateChange.emit(value ? this.toIsoDate(value) : '');
  }

  clearDate(): void {
    this.selectedDateChange.emit('');
  }

  private toIsoDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
