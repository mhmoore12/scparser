import { ScheduleSession, SessionFilters } from '../models/schedule.models';

export const DEFAULT_FILTERS: SessionFilters = {
  query: '',
  rinks: [],
  activityTypes: [],
  startDate: '',
  endDate: '',
  availableOnly: false,
};

export function collectRinks(sessions: ScheduleSession[]): string[] {
  return [...new Set(sessions.map((s) => (s.rinkLocation ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function collectActivityTypes(sessions: ScheduleSession[]): string[] {
  return [...new Set(sessions.map((s) => (s.activityType ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function applySessionFilters(
  sessions: ScheduleSession[],
  filters: SessionFilters,
): ScheduleSession[] {
  const query = filters.query.trim().toLowerCase();

  return sessions.filter((session) => {
    if (filters.availableOnly && (session.slotsAvailable ?? 0) <= 0) {
      return false;
    }

    if (filters.rinks.length > 0 && !filters.rinks.includes(session.rinkLocation ?? '')) {
      return false;
    }

    if (filters.activityTypes.length > 0 && !filters.activityTypes.includes(session.activityType ?? '')) {
      return false;
    }

    const sessionDate = session.start ? session.start.slice(0, 10) : '';

    if (filters.startDate && (!sessionDate || sessionDate < filters.startDate)) {
      return false;
    }

    if (filters.endDate && (!sessionDate || sessionDate > filters.endDate)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const eventName = (session.eventName ?? '').toLowerCase();
    const rink = (session.rinkLocation ?? '').toLowerCase();
    const activityId = `${session.activityId}`;
    return eventName.includes(query) || rink.includes(query) || activityId.includes(query);
  });
}
