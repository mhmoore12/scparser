export interface SchedulePayload {
  generatedAt: string;
  source: {
    activityListUrl: string;
    activityBaseUrl: string;
    website: string;
  };
  filters: {
    purchaseType: string;
    keywords: string[];
    maxActivities: number | null;
    fromDate: string | null;
  };
  totals: {
    allActivities: number;
    matchedSingleSessionActivities: number;
    scrapedActivities: number;
    activitiesWithSessions: number;
    sessionCount: number;
    errors: number;
  };
  activities: ActivitySummary[];
  sessions: ScheduleSession[];
  errors: unknown[];
  timing: {
    startedAt: string;
    completedAt: string;
    durationSeconds: number;
  };
}

export interface ActivitySummary {
  activityId: number;
  activityUrl: string;
  name: string | null;
  purchaseType: string | null;
  activityType: string | null;
  displayFacility: string | null;
  sessionCount: number;
}

export interface ScheduleSession {
  sessionId: number | null;
  activityId: number;
  activityUrl?: string | null;
  eventName: string | null;
  rinkLocation: string | null;
  start: string | null;
  end: string | null;
  startIsoUtc: string | null;
  endIsoUtc: string | null;
  dateInfo: string | null;
  timeRangeLabel: string | null;
  slotsAvailable: number | null;
  totalSlots: number | null;
  filledSlots: number | null;
  canPurchase: boolean | null;
  backgroundColor: string | null;
}

export interface SessionFilters {
  query: string;
  rinks: string[];
  date: string;
  availableOnly: boolean;
}
