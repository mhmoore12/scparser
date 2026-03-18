#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_ACTIVITY_LIST_URL =
  "https://starcenter.finnlyconnect.com/registration/activitylist";
const DEFAULT_ACTIVITY_BASE_URL =
  "https://starcenter.finnlyconnect.com/registration/activityitem/";
const DEFAULT_OUTPUT_PATH = "data/starcenter-schedules.json";
const TARGET_PURCHASE_TYPE = "single session";

function parseArgs(argv) {
  const opts = {
    activityListUrl: DEFAULT_ACTIVITY_LIST_URL,
    activityBaseUrl: DEFAULT_ACTIVITY_BASE_URL,
    outPath: DEFAULT_OUTPUT_PATH,
    keywords: [],
    concurrency: 6,
    maxActivities: null,
    fromDate: formatDateLocal(new Date()),
  };

  for (const arg of argv) {
    if (arg.startsWith("--out=")) {
      opts.outPath = arg.slice("--out=".length);
      continue;
    }
    if (arg.startsWith("--keywords=")) {
      opts.keywords = arg
        .slice("--keywords=".length)
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      continue;
    }
    if (arg.startsWith("--concurrency=")) {
      const n = Number(arg.slice("--concurrency=".length));
      if (Number.isFinite(n) && n > 0) {
        opts.concurrency = Math.floor(n);
      }
      continue;
    }
    if (arg.startsWith("--max-activities=")) {
      const n = Number(arg.slice("--max-activities=".length));
      if (Number.isFinite(n) && n > 0) {
        opts.maxActivities = Math.floor(n);
      }
      continue;
    }
    if (arg.startsWith("--from-date=")) {
      const value = arg.slice("--from-date=".length).trim();
      opts.fromDate = value.toLowerCase() === "all" ? null : value;
      continue;
    }
    if (arg.startsWith("--activity-list-url=")) {
      opts.activityListUrl = arg.slice("--activity-list-url=".length);
      continue;
    }
    if (arg.startsWith("--activity-base-url=")) {
      opts.activityBaseUrl = arg.slice("--activity-base-url=".length);
      continue;
    }
  }

  return opts;
}

async function fetchText(url, attempt = 1, maxAttempts = 3) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "scparser-starcenter-scraper/1.0",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    if (attempt < maxAttempts && response.status >= 500) {
      await sleep(250 * attempt);
      return fetchText(url, attempt + 1, maxAttempts);
    }
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractBalanced(text, startIndex) {
  const open = text[startIndex];
  const close = open === "[" ? "]" : open === "{" ? "}" : null;
  if (!close) {
    throw new Error(`Expected '[' or '{' at ${startIndex}`);
  }

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = startIndex; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === open) {
      depth += 1;
      continue;
    }

    if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, i + 1);
      }
    }
  }

  throw new Error(`Unbalanced JSON-like literal beginning at ${startIndex}`);
}

function extractJsonByMarker(text, marker, type = "auto") {
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }

  const from = markerIndex + marker.length;
  let i = from;
  while (i < text.length && /\s|=|:/.test(text[i])) {
    i += 1;
  }

  if (type === "array" && text[i] !== "[") {
    throw new Error(`Expected '[' after marker: ${marker}`);
  }
  if (type === "object" && text[i] !== "{") {
    throw new Error(`Expected '{' after marker: ${marker}`);
  }
  if (type === "auto" && text[i] !== "[" && text[i] !== "{") {
    throw new Error(`Expected JSON literal after marker: ${marker}`);
  }

  const literal = extractBalanced(text, i);
  return JSON.parse(literal);
}

function extractSingleSessionScheduleData(text) {
  const schedulerMarker = 'jQuery("#singleSessionSchedule").kendoScheduler(';
  const schedulerStart = text.indexOf(schedulerMarker);
  if (schedulerStart === -1) {
    return [];
  }

  const dataMarker = '"data":{"Data":';
  const dataIndex = text.indexOf(dataMarker, schedulerStart);
  if (dataIndex === -1) {
    return [];
  }

  const arrayStart = text.indexOf("[", dataIndex + dataMarker.length);
  if (arrayStart === -1) {
    return [];
  }

  const literal = extractBalanced(text, arrayStart);
  return JSON.parse(literal);
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function isSingleSessionActivity(activity) {
  const label = normalizeName(activity.DisplayActivityRegistrationType);
  return label === TARGET_PURCHASE_TYPE;
}

function keywordMatch(activityName, keywords) {
  if (keywords.length === 0) {
    return true;
  }
  const name = normalizeName(activityName);
  return keywords.some((keyword) => name.includes(keyword));
}

function toIsoOrNull(value) {
  if (!value) {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toISOString();
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDayFromIsoDate(isoDate) {
  if (!isoDate) {
    return null;
  }
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`Invalid --from-date value: ${isoDate}`);
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = [];
  const count = Math.min(concurrency, items.length);
  for (let i = 0; i < count; i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}

function buildActivityUrl(baseUrl, activityId) {
  return `${baseUrl}${activityId}`;
}

async function scrapeActivity(activity, opts) {
  const activityUrl = buildActivityUrl(opts.activityBaseUrl, activity.ActivityId);
  const pageHtml = await fetchText(activityUrl);

  const activityDetail = extractJsonByMarker(
    pageHtml,
    "window.ActivityItemManager._activity =",
    "object",
  );
  const scheduleRows = extractSingleSessionScheduleData(pageHtml);

  const sessions = scheduleRows
    .filter((row) => {
      if (!opts.fromDateFloor) {
        return true;
      }
      const start = new Date(row.Start);
      return Number.isFinite(start.getTime()) && start >= opts.fromDateFloor;
    })
    .map((row) => ({
      sessionId: row.SessionId ?? null,
      activityId: activity.ActivityId,
      activityUrl,
      eventName: activity.Name ?? null,
      rinkLocation:
        (row.DisplayFacility ||
          activityDetail.DisplayFacility ||
          activity.DisplayFacility ||
          "").trim() || null,
      start: row.Start ?? null,
      end: row.End ?? null,
      startIsoUtc: toIsoOrNull(row.Start),
      endIsoUtc: toIsoOrNull(row.End),
      dateInfo: row.DateInfo ?? null,
      timeRangeLabel: row.Info ?? null,
      slotsAvailable: row.RemainingSpots ?? null,
      totalSlots: row.MaxEnroll ?? null,
      filledSlots: row.EnrollCount ?? null,
      canPurchase: row.CanPurchase ?? null,
      backgroundColor: row.BackgroundColor ?? null,
    }));

  return {
    activity: {
      activityId: activity.ActivityId,
      activityUrl,
      name: activity.Name ?? null,
      purchaseType: activity.DisplayActivityRegistrationType ?? null,
      activityType: activity.DisplayActivityType ?? null,
      defaultLocationText: activity.DefaultLocationText ?? null,
      displayFacility: activity.DisplayFacility ?? null,
      displayActivityDate: activity.DisplayActivityDate ?? null,
      onlineViewStartDate: activity.OnlineViewStartDate ?? null,
      onlineViewEndDate: activity.OnlineViewEndDate ?? null,
      purchaseStartDate: activity.PurchaseStartDate ?? null,
      purchaseEndDate: activity.PurchaseEndDate ?? null,
      maxEnroll: activity.MaxEnroll ?? null,
      showAge: activity.ShowAge ?? null,
      ageDisplay: activity.AgeDisplay ?? null,
      registrationOpenLabel: activityDetail.DisplayInfo ?? null,
      sessionCount: sessions.length,
    },
    sessions,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const startedAt = new Date();
  opts.fromDateFloor = startOfDayFromIsoDate(opts.fromDate);

  const activityListHtml = await fetchText(opts.activityListUrl);
  const allActivities = extractJsonByMarker(activityListHtml, "_activityList =", "array");

  let filtered = allActivities.filter(isSingleSessionActivity);
  filtered = filtered.filter((a) => keywordMatch(a.Name, opts.keywords));

  if (opts.maxActivities) {
    filtered = filtered.slice(0, opts.maxActivities);
  }

  const errors = [];
  const parsed = await mapWithConcurrency(filtered, opts.concurrency, async (activity) => {
    try {
      return await scrapeActivity(activity, opts);
    } catch (error) {
      errors.push({
        activityId: activity.ActivityId,
        activityName: activity.Name ?? null,
        activityUrl: buildActivityUrl(opts.activityBaseUrl, activity.ActivityId),
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  });

  const activities = [];
  const sessions = [];
  for (const item of parsed) {
    if (!item) {
      continue;
    }
    activities.push(item.activity);
    sessions.push(...item.sessions);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: {
      activityListUrl: opts.activityListUrl,
      activityBaseUrl: opts.activityBaseUrl,
      website: "starcenter.finnlyconnect.com",
    },
    filters: {
      purchaseType: "Single Session",
      keywords: opts.keywords,
      maxActivities: opts.maxActivities,
      fromDate: opts.fromDate,
    },
    totals: {
      allActivities: allActivities.length,
      matchedSingleSessionActivities: allActivities.filter(isSingleSessionActivity).length,
      scrapedActivities: activities.length,
      activitiesWithSessions: activities.filter((a) => a.sessionCount > 0).length,
      sessionCount: sessions.length,
      errors: errors.length,
    },
    activities,
    sessions,
    errors,
    timing: {
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
      durationSeconds: Number(
        ((Date.now() - startedAt.getTime()) / 1000).toFixed(3),
      ),
    },
  };

  const outputPath = path.resolve(opts.outPath);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(
    [
      `Wrote ${outputPath}`,
      `single-session activities scraped: ${payload.totals.scrapedActivities}`,
      `sessions captured: ${payload.totals.sessionCount}`,
      `errors: ${payload.totals.errors}`,
    ].join(" | "),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
