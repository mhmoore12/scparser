import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { SchedulePayload } from '../models/schedule.models';
import { normalizeRink } from '../utils/rink-normalize.util';

@Injectable({ providedIn: 'root' })
export class ScheduleDataService {
  constructor(private readonly http: HttpClient) {}

  load(): Observable<SchedulePayload> {
    return this.http.get<SchedulePayload>('/data/starcenter-schedules.json').pipe(
      map((payload) => {
        const activityUrlById = new Map(
          payload.activities.map((activity) => [activity.activityId, activity.activityUrl]),
        );

        return {
          ...payload,
          sessions: [...payload.sessions]
            .map((session) => ({
              ...session,
              activityUrl: activityUrlById.get(session.activityId) ?? null,
              rinkLocation: normalizeRink(session.rinkLocation),
            }))
            .sort((a, b) => {
              const left = a.start ? Date.parse(a.start) : 0;
              const right = b.start ? Date.parse(b.start) : 0;
              return left - right;
            }),
        };
      }),
    );
  }
}
