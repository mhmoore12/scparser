import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ScheduleSession } from '../../models/schedule.models';

@Component({
  selector: 'app-session-card',
  imports: [DatePipe, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule],
  templateUrl: './session-card.component.html',
  styleUrl: './session-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionCardComponent {
  @Input({ required: true }) session!: ScheduleSession;

  get occupancyRatio(): number {
    if (!this.session.totalSlots || this.session.totalSlots <= 0 || this.session.filledSlots == null) {
      return 0;
    }
    return Math.min(1, this.session.filledSlots / this.session.totalSlots);
  }
}
