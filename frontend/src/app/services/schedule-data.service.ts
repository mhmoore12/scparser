import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { SchedulePayload } from '../models/schedule.models';
import { normalizeRink } from '../utils/rink-normalize.util';

@Injectable({ providedIn: 'root' })
export class ScheduleDataService {
  private static readonly LOCAL_DATA_URL = 'data/starcenter-schedules.json';
  private static readonly RAW_FALLBACK_URL =
    'https://raw.githubusercontent.com/mhmoore12/scparser/refs/heads/main/data/starcenter-schedules.json';

  constructor(private readonly http: HttpClient) {}

  load(): Observable<SchedulePayload> {
    return this.http.get<SchedulePayload>(ScheduleDataService.LOCAL_DATA_URL).pipe(
      catchError(() =>
        this.http.get<SchedulePayload>(ScheduleDataService.RAW_FALLBACK_URL).pipe(
          catchError((error) => throwError(() => error)),
        ),
      ),
      map((payload) => {
        const activityUrlById = new Map(
          payload.activities.map((activity) => [activity.activityId, activity.activityUrl]),
        );
        const activityTypeById = new Map(
          payload.activities.map((activity) => [activity.activityId, activity.activityType]),
        );

        return {
          ...payload,
          sessions: [...payload.sessions]
            .map((session) => ({
              ...session,
              activityUrl: activityUrlById.get(session.activityId) ?? null,
              activityType: activityTypeById.get(session.activityId) ?? null,
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
