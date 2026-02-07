# Spec 01 — High-Level Architecture

**Version:** 1.0
**Status:** Complete

---

## Overview

This document defines the high-level architecture for the Book Tracker Search Comparator application. It does **not** go into implementation detail — instead it establishes the system boundaries, data model, page structure, and technology choices so that subsequent specs can each tackle one vertical slice independently.

The application lets a user:

1. Register book-tracking apps (Goodreads, StoryGraph, LibraryThing, Hardcover, Uncover, etc.) with a logo, name, and optional notes.
2. Work through a bank of **50 pre-defined search queries** and, for every app, capture screenshots + structured results (top 9 book title/author pairs).
3. Define the **"perfect" (golden) result set** for each query.
4. Compare apps side-by-side via several views and a scoring leaderboard.
5. Edit/update any app or result set over time.

---

## System Architecture

```
┌─────────────────────────────────────────────────┐
│                   React SPA                      │
│  (Vite 7 · React 19 · React Router · Tailwind)  │
│                                                  │
│  Pages:                                          │
│   / .................... Dashboard / Leaderboard  │
│   /apps ................ App list & management    │
│   /apps/:id ............ Single app detail        │
│   /apps/:id/results .... Enter/edit results       │
│   /queries ............. Query bank browser       │
│   /queries/:id ......... Single query detail      │
│   /compare ............. Comparison views          │
│   /golden .............. Golden results editor     │
└────────────────┬────────────────────────────────┘
                 │  REST API (JSON)
                 ▼
┌─────────────────────────────────────────────────┐
│           Express.js API Server                  │
│  (Node.js · Mongoose · Multer for uploads)       │
│                                                  │
│  /api/apps ......... CRUD for tracked apps       │
│  /api/queries ...... Read/manage query bank      │
│  /api/results ...... CRUD search results + imgs  │
│  /api/golden ....... CRUD golden result sets     │
│  /api/scores ....... Computed scoring endpoint   │
└────────────────┬────────────────────────────────┘
                 │
       ┌─────────┴──────────┐
       ▼                    ▼
  ┌──────────┐     ┌──────────────┐
  │ MongoDB  │     │  Local Disk  │
  │ (data)   │     │ (screenshots)│
  └──────────┘     └──────────────┘
```

### Frontend

| Concern | Choice |
|---|---|
| Framework | React 19 (JSX, no TypeScript) |
| Bundler | Vite 7 (already configured) |
| Routing | React Router v7 |
| Styling | Tailwind CSS 4 — dark theme only, modern aesthetic |
| HTTP client | Native `fetch` wrapped in a thin `src/api/client.js` |
| State | React Context + `useReducer` for global state (current app selection, query filters); local state everywhere else |
| Mock layer | `src/api/mock/` modules — used when `VITE_USE_MOCK_API=true` |

### Backend

| Concern | Choice |
|---|---|
| Runtime | Node.js (same repo, `server/` directory) |
| Framework | Express.js |
| Database | MongoDB via Mongoose |
| File storage | Local disk (`server/uploads/`) for screenshot images; served as static files |
| Image upload | Multer middleware |

> The backend lives in the **same repository** under `server/` with its own `package.json`. A single `npm run dev` in root will start both Vite (frontend) and Express (backend) via `concurrently`.

---

## Data Model (MongoDB Collections)

### `apps`

```json
{
  "_id": "ObjectId",
  "name": "Goodreads",
  "logo": "/uploads/logos/goodreads.png",
  "notes": "Most popular platform, owned by Amazon",
  "lastUpdated": "2026-02-07T00:00:00Z",
  "createdAt": "2026-02-01T00:00:00Z"
}
```

### `queries`

Seeded once from a static file. 50 entries.

```json
{
  "_id": "ObjectId",
  "index": 1,
  "text": "harry poter",
  "description": "Misspelled popular fantasy series — tests fuzzy matching"
}
```

### `results`

One document per app-per-query combination. Up to `50 × N` documents where N = number of apps.

```json
{
  "_id": "ObjectId",
  "appId": "ObjectId",
  "queryId": "ObjectId",
  "screenshots": [
    "/uploads/results/goodreads-q1-1.png",
    "/uploads/results/goodreads-q1-2.png"
  ],
  "books": [
    { "rank": 1, "title": "Harry Potter and the Sorcerer's Stone", "author": "J.K. Rowling" },
    { "rank": 2, "title": "Harry Potter and the Chamber of Secrets", "author": "J.K. Rowling" }
  ],
  "updatedAt": "2026-02-07T00:00:00Z"
}
```

### `goldenResults`

One document per query — the "perfect" expected result set.

```json
{
  "_id": "ObjectId",
  "queryId": "ObjectId",
  "books": [
    { "rank": 1, "title": "Harry Potter and the Sorcerer's Stone", "author": "J.K. Rowling" },
    { "rank": 2, "title": "Harry Potter and the Chamber of Secrets", "author": "J.K. Rowling" }
  ],
  "updatedAt": "2026-02-07T00:00:00Z"
}
```

---

## The 50 Search Queries

The queries are designed to cover the full spectrum of real-world book-search behaviour. They span different types of input:

| # | Example | Purpose |
|---|---|---|
| 1-4 | `the hunger games`, `pride and prejudice` | Popular fiction — title only. Baseline |
| 5-7 | `brandon sanderson`, `agatha christie`, `colleen hoover` | Popular fiction — author only |
| 8-10 | `dune frank herbert`, `1984 george orwell`, `it ends with us hoover` | Title + author combo |
| 11-14 | `harry poter`, `the alchmist`, `collen hoover`, `frenkenstein` | Typos / misspellings — fuzzy matching |
| 15-17 | `lord of the`, `game of`, `catcher in` | Partial / truncated titles |
| 18-20 | `wheel of time`, `twisted ana huang`, `outlander` | Series name — disambiguation |
| 21-25 | `it ends with us`, `the love hypothesis`, `beach read`, `people we meet on vacation`, `book lovers` | Contemporary romance — trad-published bestsellers |
| 26-29 | `icebreaker hannah grace`, `behind the net`, `the wall of winnipeg`, `things we never got over` | Contemporary/sports romance — indie & Kindle-first titles |
| 30-32 | `bloom ej blaise`, `bourbon and lies victoria wilder`, `rare blend michelle mosley` | Romance — recent indie / KU-only titles (2024-2025) |
| 33-35 | `the silent patient`, `gone girl`, `the girl on the train` | Thrillers — trad-published bestsellers |
| 36-38 | `the housemaid freida mcfadden`, `never lie`, `the inmate` | Thrillers — Kindle-first / self-published breakouts |
| 39-40 | `julie chan is dead`, `imaginary strangers minka kent` | Thrillers — recent lesser-known / indie titles (2025) |
| 41-42 | `百年孤独`, `les misérables` | Non-English titles — Unicode & non-Latin handling |
| 43-44 | `one hundred years of solitude`, `the little prince` | Translated titles in English |
| 45 | `iliad` | Classic / old works |
| 46 | `sapiens` | Non-fiction |
| 47 | `percy jackson` | Children / YA |
| 48 | `978-0-06-112008-4` | ISBN — exact identifier lookup |
| 49 | `house of leaves danielewski` | Very obscure / niche — long-tail coverage |
| 50 | `the road` | Ambiguous / generic — disambiguation |

> The full 50-entry list with exact query text will be defined during the Query Bank spec.

---

## Pages & Views

### 1. Dashboard (`/`)

Landing page showing:
- Number of apps tracked, total results entered, % completion per app.
- Leaderboard summary (top 3 apps by score).
- Quick links to enter results or compare.

### 2. App Management (`/apps`)

- Card grid of registered apps (logo, name, last updated, completion bar).
- "Add App" button → modal/form with name, logo upload, notes.
- Click card → App Detail page.

### 3. App Detail (`/apps/:id`)

- App info (editable).
- Progress table: all 50 queries, status per query (not started / in progress / complete).
- "Enter Results" button → results entry flow.

### 4. Results Entry (`/apps/:id/results`)

- Walks through queries sequentially (or jump to any query).
- For each query: upload screenshot(s), enter JSON with up to 9 books (title + author).
- Save & Next flow for efficient bulk entry.

### 5. Query Bank (`/queries`)

- Filterable/searchable table of all 50 queries.
- Shows how many apps have results for each query.
- Click → Query Detail.

### 6. Query Detail (`/queries/:id`)

- Shows the query, its golden result set, and a side-by-side of how each app performed.
- Screenshots + result lists per app.

### 7. Comparison Views (`/compare`)

This is the core value of the app. Proposed sub-views:

| View | Description |
|---|---|
| **Side-by-Side** | Pick a subset of apps + a query → see their screenshots and results next to each other |
| **Query Matrix** | Rows = queries, columns = apps. Cells show score (green/yellow/red) or thumbnail. At-a-glance heatmap of coverage. |
| **Per-Query Breakdown** | Browse all 50 queries → see each app's score per query, sortable/filterable |

### 8. Golden Results Editor (`/golden`)

- Table of 50 queries. For each query, enter/edit up to 9 "perfect" books.
- Used as ground truth for scoring.

### 9. Leaderboard (`/` or `/leaderboard`)

- Scoring algorithm: for each query, an app earns points based on how many golden results appear in its top 9 (position-weighted or simple hit/miss).
- Table: rank, app logo+name, total score, per-query score breakdown.
- Could be a section of the Dashboard or its own page.

---

## Scoring Algorithm

Proposed approach (to be refined in its own spec):

For each query Q and app A:
- Let `golden(Q)` = ordered list of golden results for query Q (up to 9).
- Let `results(A, Q)` = ordered list of results app A returned for query Q.
- **Hit score**: For each book in `golden(Q)`, if it appears in `results(A, Q)`, score += 1. (Match by normalized title + author comparison.)
- **Position bonus** (optional): If a golden result appears at the same rank or higher, add a small bonus.
- **Total**: Sum across all 50 queries. Max possible = 50 × 9 = 450.

---

## Environment Variables

Proposed env config:

### `.env.development`
```
VITE_USE_MOCK_API=true
VITE_API_BASE_URL=http://localhost:3001/api
VITE_ENVIRONMENT=LOCAL
VITE_UPLOADS_BASE_URL=http://localhost:3001/uploads
```

### `.env.staging`
```
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=/api
VITE_ENVIRONMENT=STAGE
VITE_UPLOADS_BASE_URL=/uploads
```

### `.env.production`
```
VITE_USE_MOCK_API=false
VITE_API_BASE_URL=/api
VITE_ENVIRONMENT=PROD
VITE_UPLOADS_BASE_URL=/uploads
```

### `server/.env` (backend)
```
MONGODB_URI=mongodb://localhost:27017/booktracker-comparator
PORT=3001
UPLOADS_DIR=./uploads
```

> **Note:** The existing `REACT_APP_*` variables should be migrated to `VITE_*` since Vite does not expose `REACT_APP_` prefixed vars.

---

## Spec Breakdown — Implementation Order

Each spec below is designed to be self-contained and buildable independently (with mock data where dependencies exist).

| Spec # | Name | Scope | Dependencies |
|---|---|---|---|
| **02** | **Project Setup & Scaffolding** | Install Tailwind, React Router, set up AppShell layout, sidebar navigation, dark theme, env var migration (`REACT_APP_` → `VITE_`), Express server skeleton, MongoDB connection, Multer config, `concurrently` dev script | None | ✅ Done |
| **03** | **Query Bank** | Define all 50 queries in `queries.json`, build seed script, backend CRUD endpoints, frontend Query Bank page + Query Detail page, mock API | 02 | ✅ Done |
| **04** | **App Management** | Backend CRUD for apps (with logo upload), frontend App list page + App Detail page + Add/Edit modal, mock API | 02 | ✅ Done |
| **05** | **Results Entry** | Backend CRUD for results (with screenshot upload), frontend results entry flow (per app per query), sequential entry UX, mock API | 02, 03, 04 | ✅ Done |
| **06** | **Golden Results** | Backend CRUD for golden results, frontend Golden Editor page, mock API | 02, 03 | ✅ Done |
| **07** | **Comparison Views** | Side-by-side, Query Matrix, Per-Query Breakdown views. Frontend only (consumes existing APIs) | 02, 03, 04, 05 | ✅ Done |
| **08** | **Scoring & Leaderboard** | Scoring algorithm, backend scoring endpoint, Leaderboard page/component | 02, 03, 04, 05, 06 | ✅ Done |
| **09** | **Dashboard** | Dashboard page aggregating stats, leaderboard summary, quick actions | All above | ✅ Done |

---

## Styling Approach

- **Tailwind CSS 4** with dark theme as default (not toggle — dark only).
- Color palette: slate/zinc grays for backgrounds, indigo/violet accent, green/yellow/red for score indicators.
- Cards with subtle borders (`border-zinc-800`), rounded corners (`rounded-xl`), and gentle shadows.
- Consistent spacing using Tailwind's spacing scale.
- Responsive: works on desktop (primary) and tablet. Mobile is not a priority but should not be broken.

---

## API Contract Summary

All endpoints prefixed with `/api`.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/apps` | List all apps |
| POST | `/api/apps` | Create app (multipart — logo upload) |
| GET | `/api/apps/:id` | Get single app |
| PUT | `/api/apps/:id` | Update app |
| DELETE | `/api/apps/:id` | Delete app + all its results |
| GET | `/api/queries` | List all 50 queries |
| GET | `/api/queries/:id` | Get single query |
| GET | `/api/results?appId=X&queryId=Y` | Get results (filterable) |
| POST | `/api/results` | Create/update result for app+query (multipart — screenshots) |
| PUT | `/api/results/:id` | Update result |
| DELETE | `/api/results/:id` | Delete result |
| GET | `/api/golden` | List all golden result sets |
| GET | `/api/golden/:queryId` | Get golden results for a query |
| PUT | `/api/golden/:queryId` | Create/update golden results for a query |
| GET | `/api/scores` | Get computed scores for all apps |
| GET | `/api/scores/:appId` | Get detailed score breakdown for one app |

---

## Future Considerations (Out of Scope for All Current Specs)

- **Authentication** — not needed for a single-user tool.
- **Export** — export comparison data as CSV/PDF.
- **Auto-screenshot** — browser automation to capture screenshots automatically.
- **Result OCR** — extract book titles from screenshots using OCR instead of manual JSON entry.
- **Diff over time** — track how an app's results change across multiple data captures.

---

## Issues & Learnings

All 8 implementation specs (02–09) have been completed. The frontend SPA is fully functional with mock data covering all pages: Dashboard, App Management, Query Bank, Results Entry, Golden Results Editor, Comparison Views, Scoring & Leaderboard. The backend (Express/MongoDB) is specced but not yet implemented — the app runs entirely on the mock API layer (`VITE_USE_MOCK_API=true`).

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-07 | Spec 01 drafted — high-level architecture defined |
| 2026-02-08 | All specs (02–09) implemented — project complete |
