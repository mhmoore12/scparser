import { ScheduleSession, SessionFilters } from '../models/schedule.models';

export const DEFAULT_FILTERS: SessionFilters = {
  query: '',
  rinks: [],
  date: '',
  availableOnly: false,
};

export function collectRinks(sessions: ScheduleSession[]): string[] {
  return [...new Set(sessions.map((s) => (s.rinkLocation ?? '').trim()).filter(Boolean))].sort((a, b) =>
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

    if (filters.date && !session.start?.startsWith(filters.date)) {
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
