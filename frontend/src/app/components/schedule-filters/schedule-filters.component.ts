import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SessionFilters } from '../../models/schedule.models';

@Component({
  selector: 'app-schedule-filters',
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  templateUrl: './schedule-filters.component.html',
  styleUrl: './schedule-filters.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleFiltersComponent {
  @Input({ required: true }) filters!: SessionFilters;
  @Input() rinks: string[] = [];
  @Output() readonly filtersChange = new EventEmitter<SessionFilters>();

  update<K extends keyof SessionFilters>(key: K, value: SessionFilters[K]): void {
    this.filtersChange.emit({ ...this.filters, [key]: value });
  }
}
