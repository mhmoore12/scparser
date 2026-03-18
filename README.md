# scparser

Scrapes StarCenter Finnly "Single Session" activity schedules into JSON.

## What it captures

- Activity metadata (name, type, purchase type, activity dates, page URL)
- Session-level schedule rows
- Rink location
- Start/end time
- Event name
- Slots available (`RemainingSpots`)
- Total slots (`MaxEnroll`)
- Filled slots (`EnrollCount`)
- Extra fields exposed by the page payload (purchase/open labels, age metadata, source values)

## Local usage

```bash
node scripts/scrape-starcenter-schedules.mjs --out=data/starcenter-schedules.json
```

Optional flags:

- `--keywords=drop in,public skate,stick and puck,parent-child`
- `--from-date=YYYY-MM-DD` (default is today, local time)
- `--from-date=all` (disable date filtering)
- `--concurrency=6`
- `--max-activities=25`
- `--activity-list-url=...`
- `--activity-base-url=...`

## Output file

Default output path:

- `data/starcenter-schedules.json`

Top-level shape:

- `generatedAt`
- `source`
- `filters`
- `totals`
- `activities[]`
- `sessions[]`
- `errors[]`
- `timing`

## GitHub Actions

Workflow file:

- `.github/workflows/scrape-starcenter-schedules.yml`

It runs daily and on manual dispatch, then:

1. runs the scraper
2. uploads `data/starcenter-schedules.json` as an artifact
3. commits the latest JSON back to the repo (if changed)

That committed file can be consumed via raw GitHub URL:

- `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/data/starcenter-schedules.json`

## Angular frontend

Frontend path:

- `frontend/`

Features:

- Angular Material UI with Dallas Stars-inspired color palette
- Responsive mobile + desktop layout
- Small standalone components (`loading-state`, `schedule-filters`, `session-card`)
- Filterable schedule list (search, rink, date, available slots)
- JSON feed loaded from `/data/starcenter-schedules.json`

Run locally:

```bash
cd frontend
npm install
npm start
```

Build:

```bash
cd frontend
npm run build
```
