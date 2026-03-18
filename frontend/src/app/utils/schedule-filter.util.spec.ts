import { ScheduleSession } from '../models/schedule.models';
import { applySessionFilters, collectRinks, DEFAULT_FILTERS } from './schedule-filter.util';

const sessions: ScheduleSession[] = [
  {
    sessionId: 1,
    activityId: 100,
    eventName: 'Drop In Hockey',
    rinkLocation: 'FR - Comerica Center',
    start: '2026-03-20T10:00:00',
    end: '2026-03-20T11:00:00',
    startIsoUtc: null,
    endIsoUtc: null,
    dateInfo: null,
    timeRangeLabel: null,
    slotsAvailable: 2,
    totalSlots: 20,
    filledSlots: 18,
    canPurchase: true,
    backgroundColor: null,
  },
  {
    sessionId: 2,
    activityId: 101,
    eventName: 'Public Skate',
    rinkLocation: 'EU - Zubov Rink',
    start: '2026-03-21T09:00:00',
    end: '2026-03-21T10:00:00',
    startIsoUtc: null,
    endIsoUtc: null,
    dateInfo: null,
    timeRangeLabel: null,
    slotsAvailable: 0,
    totalSlots: 40,
    filledSlots: 40,
    canPurchase: true,
    backgroundColor: null,
  },
];

describe('schedule filter util', () => {
  it('collects sorted unique rinks', () => {
    expect(collectRinks(sessions)).toEqual(['EU - Zubov Rink', 'FR - Comerica Center']);
  });

  it('filters by query text', () => {
    const result = applySessionFilters(sessions, { ...DEFAULT_FILTERS, query: 'drop in' });
    expect(result.length).toBe(1);
    expect(result[0].sessionId).toBe(1);
  });

  it('filters by availability', () => {
    const result = applySessionFilters(sessions, { ...DEFAULT_FILTERS, availableOnly: true });
    expect(result.length).toBe(1);
    expect(result[0].sessionId).toBe(1);
  });
});
