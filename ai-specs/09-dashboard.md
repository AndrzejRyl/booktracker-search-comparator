# Spec 09 — Dashboard

**Version:** 1.0
**Status:** Implemented

---

## Overview

This spec defines the **Dashboard** page — the landing page of the application at `/`. It provides a single-screen overview of the project's current state: how many apps are tracked, how much data has been entered, where gaps exist, and which apps lead the leaderboard.

It covers:

1. Replacing the **DashboardPage placeholder** with a fully functional overview page.
2. **Aggregating data** from existing API endpoints (apps, queries, results, golden results, scores) — no new backend endpoints needed.
3. Displaying **four dashboard sections**: Stats Cards, Leaderboard Summary, Data Completion Overview, and Quick Actions.
4. Creating a **mock-compatible** implementation that works with the existing mock API layer.

The Dashboard is **read-only** — it displays computed summaries. All mutations happen on other pages (App Management, Results Entry, Golden Editor).

---

## Dependencies

- **Spec 02 (Project Setup & Scaffolding)** — provides routing, AppShell, API client, mock infrastructure.
- **Spec 03 (Query Bank)** — provides the 50 queries.
- **Spec 04 (App Management)** — provides app data.
- **Spec 05 (Results Entry)** — provides result data for computing completion.
- **Spec 06 (Golden Results)** — provides golden result data for completion tracking.
- **Spec 08 (Scoring & Leaderboard)** — provides the scoring API (`GET /api/scores`) for leaderboard summary.

> All dependencies are already implemented. This is the final spec in the project.

---

## Backend API

### No new endpoints needed

The Dashboard consumes existing endpoints only. All data is fetched client-side and aggregated in the component.

| Endpoint | Purpose on Dashboard |
|---|---|
| `GET /api/apps` | Count of tracked apps, app names/logos for leaderboard and completion |
| `GET /api/queries` | Total query count (always 50), category distribution |
| `GET /api/results?appId=X` | Per-app result counts for completion tracking |
| `GET /api/golden` | Golden results count for completion tracking |
| `GET /api/scores` | Leaderboard data — top apps by score |

### Data Fetching Strategy

The Dashboard fetches data in two waves (same pattern as `ComparePage`):

1. **First wave** — `Promise.all([fetchApps(), fetchQueries(), fetchGoldenResults()])`. Additionally, `fetchScores()` is called in the same parallel batch but **wrapped in a try/catch** that returns `null` on failure — scores are supplementary, so a failure here must not block the page.
2. **Second wave** — After apps are loaded, fetch results per app in parallel: `Promise.all(apps.map(a => fetchResults(a._id)))`, then flatten.

A single `loading` state covers both waves. The page shows a skeleton until all data is loaded.

> **Why fetch results per-app?** The existing `fetchResults()` API requires at least `appId` or `queryIndex`. There is no "fetch all results" endpoint. Per-app parallel fetch (same approach as `ComparePage`) works well with the expected data volume (5–10 apps × 50 queries max).

---

## Frontend API Module

### No new API module needed

The page uses existing API modules:

- `src/api/apps.js` — `fetchApps()`
- `src/api/queries.js` — `fetchQueries()`
- `src/api/results.js` — `fetchResults(appId)`
- `src/api/golden.js` — `fetchGoldenResults()`
- `src/api/scores.js` — `fetchScores()`

No new functions are needed.

---

## Mock API Layer

### No new mock data or handlers needed

The existing mock data provides sufficient content for the Dashboard:

- 5 mock apps
- 50 mock queries across 13 categories
- 7 mock results (app1: 4, app2: 2, app3: 1, app4: 0, app5: 0)
- 5 mock golden results (queries 1, 2, 5, 7, 19)
- Scoring computed dynamically from the above

This is enough to demonstrate all dashboard sections with a realistic mix of populated and empty states.

---

## Frontend Pages

### Directory & File Structure (New/Modified Files)

```
src/
├── pages/
│   └── DashboardPage.jsx          # MODIFIED — replace placeholder with full dashboard
```

No new files are created. No new components, constants, or utilities needed. The Dashboard reuses existing constants (`getScoreColor`, `getScoreBgColor` from `src/constants/scoreColors.js`).

### `DashboardPage.jsx` — Dashboard (`/`)

The main landing page. Shows an overview of the project's state across four sections.

**Layout — Top-level structure:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Dashboard                                                                │
│  Overview of your search comparison project.                              │
│                                                                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐             │
│  │  📱 Apps        │  │  📋 Results     │  │  ⭐ Golden      │             │
│  │  5 tracked      │  │  7 / 250       │  │  5 / 50        │             │
│  │                 │  │  2.8% complete  │  │  10% defined   │             │
│  └────────────────┘  └────────────────┘  └────────────────┘             │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Leaderboard Summary                                                │ │
│  │                                                                      │ │
│  │  🥇 Goodreads        33.3%  ████████░░░░░░░░░░░░░░░░░░░░           │ │
│  │  🥈 Hardcover        26.7%  ██████░░░░░░░░░░░░░░░░░░░░░░           │ │
│  │  🥉 StoryGraph        6.7%  ██░░░░░░░░░░░░░░░░░░░░░░░░░░           │ │
│  │                                                                      │ │
│  │  5 / 50 queries scored  ·  View full leaderboard →                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Data Completion by App                                             │ │
│  │                                                                      │ │
│  │  App               Results     Progress                              │ │
│  │  ─────────────────────────────────────────                           │ │
│  │  Goodreads         4 / 50      ████░░░░░░░░░░░░░░░░  8%            │ │
│  │  Hardcover         2 / 50      ██░░░░░░░░░░░░░░░░░░  4%            │ │
│  │  StoryGraph        1 / 50      █░░░░░░░░░░░░░░░░░░░  2%            │ │
│  │  LibraryThing      0 / 50      ░░░░░░░░░░░░░░░░░░░░  0%            │ │
│  │  Uncover           0 / 50      ░░░░░░░░░░░░░░░░░░░░  0%            │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────┐  ┌──────────────────┐  ┌──────────────────────┐       │
│  │  + Add App   │  │  Enter Results   │  │  Define Golden       │       │
│  │              │  │                  │  │  Results             │       │
│  │  Register a  │  │  Start entering  │  │  5/50 queries have   │       │
│  │  new app to  │  │  search results  │  │  golden results.     │       │
│  │  compare.    │  │  for your apps.  │  │  Define more.        │       │
│  └──────────────┘  └──────────────────┘  └──────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Section 1: Stats Cards

Three horizontal stat cards at the top providing key numbers at a glance.

**Card 1 — Apps Tracked:**
- Icon area: indigo accent
- Value: number of apps (e.g., "5")
- Label: "apps tracked"
- Subtext: none

**Card 2 — Results Entered:**
- Icon area: emerald accent
- Value: total results across all apps / total possible (apps × 50) (e.g., "7 / 250")
- Label: "results entered"
- Subtext: completion percentage (e.g., "2.8% complete")

**Card 3 — Golden Results:**
- Icon area: amber accent
- Value: golden results count / 50 (e.g., "5 / 50")
- Label: "golden results defined"
- Subtext: percentage (e.g., "10% defined")

**Computing values:**

```js
const totalApps = apps.length;
const totalPossibleResults = totalApps * 50;
const totalResults = results.length; // flat array of all results
const resultsPercentage = totalPossibleResults > 0
  ? Math.round((totalResults / totalPossibleResults) * 1000) / 10
  : 0;
const goldenCount = goldenResults.length;
const goldenPercentage = Math.round((goldenCount / 50) * 1000) / 10;
```

**Card layout:** `grid grid-cols-1 md:grid-cols-3 gap-4 mb-6`

---

### Section 2: Leaderboard Summary

A card showing the top apps by score — a compact view of the Leaderboard page data.

**Behavior:**

- Shows **all ranked apps** (not just top 3) sorted by score descending, since there are at most 5–10 apps.
- Each row shows: rank medal/number, app logo (24×24), app name, percentage, and a horizontal progress bar.
- **Rank display**: Rank 1 = gold medal text (`text-amber-400`), rank 2 = silver (`text-zinc-300`), rank 3 = bronze (`text-amber-700`), rank 4+ = plain number (`text-zinc-500`).
- **App name**: Clickable `<Link>` — navigates to `/apps/{appId}`.
- **Percentage** text color uses `getScoreColor(percentage)`.
- **Progress bar**: A thin horizontal bar (`h-2 rounded-full`) behind each row. Fill width = percentage, fill color uses `getScoreBgColor(percentage)`. Background track: `bg-zinc-800`.
- **Footer**: Shows golden coverage ("5 / 50 queries scored") and a link to the full Leaderboard page → "View full leaderboard →" linking to `/leaderboard`.

**Data source:** Uses `scoreData.apps` from the `fetchScores()` response. The data is already sorted by rank.

**Empty state — no scoring data:**

When `scoreData.apps` is empty or `scoreData.goldenCoverage === 0`:
- Show: "No scoring data available yet." with context about what's needed.
- If no golden results: "Define golden results to enable scoring." with link to `/golden`.
- If golden results exist but no apps: "Add apps and enter results to see rankings." with link to `/apps`.

---

### Section 3: Data Completion by App

A table showing how many of the 50 queries each app has results for, with visual progress bars. This gives a quick overview of data entry progress and helps identify which apps need more work.

**Behavior:**

- Lists all apps sorted by completion percentage (highest first).
- Columns: App (logo + name), Results (X / 50), Progress bar, Percentage.
- **App name**: Clickable — navigates to `/apps/{appId}`.
- **Progress bar**: A thin horizontal bar (`h-2 rounded-full`). Fill width = completion %. Fill color: emerald for ≥80%, amber for ≥40%, rose for <40%. Background track: `bg-zinc-800`.
- **Percentage text**: Same color coding as the progress bar fill.

**Computing per-app completion:**

```js
const appCompletion = apps.map((app) => {
  const appResults = results.filter((r) => r.appId === app._id);
  const count = appResults.length;
  const percentage = Math.round((count / 50) * 1000) / 10;
  return { app, count, percentage };
}).sort((a, b) => b.percentage - a.percentage);
```

**Empty state — no apps:** This section is hidden entirely when there are no apps (the Quick Actions section will prompt the user to add apps).

---

### Section 4: Quick Actions

Three action cards at the bottom providing convenient entry points to common tasks. These serve as a guided workflow for new users and quick shortcuts for returning users. **No section heading** — just the three cards.

**Card 1 — Add App:**
- Title: "Add App"
- Description: "Register a new book tracking app to compare."
- Link: `/apps` (the Apps page, where the Add App button lives)
- Visual: indigo border accent on hover

**Card 2 — Enter Results:**
- Title: "Enter Results"
- Description: "Start entering search results for your apps."
- Link: `/apps` (user picks an app, then navigates to results entry from App Detail — this is the intended flow)
- Subtext (dynamic): If apps exist with 0 results, show "X apps have no results yet". Otherwise hide.

**Card 3 — Define Golden Results:**
- Title: "Define Golden Results"
- Description: dynamic based on state:
  - If 0 golden results: "Define the perfect result set for each query to enable scoring."
  - If some but not all: "X / 50 queries have golden results. Define more to improve scoring coverage."
  - If all 50: "All 50 queries have golden results defined."
- Link: `/golden`

**Card layout:** `grid grid-cols-1 md:grid-cols-3 gap-4`

---

## State

All state is local to `DashboardPage`:

- `apps` — array of app objects (from `fetchApps()`).
- `queries` — array of query objects (from `fetchQueries()`).
- `results` — flat array of all result objects across all apps.
- `goldenResults` — array of golden result objects (from `fetchGoldenResults()`).
- `scoreData` — the full scoring response object (from `fetchScores()`), or `null`.
- `loading` — boolean (covers both fetch waves).
- `error` — string or `null`.

No global state, no URL search params, no context — everything is derived from the fetched data.

---

## Styling

All styling uses **Tailwind CSS 4** classes consistent with the dark theme established in Spec 02.

### Page Header

```
- Container: mb-6
- Title: text-2xl font-bold text-zinc-100 mb-1
- Subtitle: text-sm text-zinc-400
```

### Stats Cards

```
- Grid: grid grid-cols-1 md:grid-cols-3 gap-4 mb-6
- Card: bg-zinc-900 border border-zinc-800 rounded-xl p-5
- Icon area: w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3
- Icon area (apps): bg-indigo-900/50
- Icon area (results): bg-emerald-900/50
- Icon area (golden): bg-amber-900/50
- Value: text-2xl font-bold text-zinc-100
- Value secondary (denominator): text-lg text-zinc-500 font-normal
- Label: text-sm text-zinc-400 mt-1
- Subtext: text-xs text-zinc-500 mt-0.5
```

### Leaderboard Summary Card

```
- Card: bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6
- Section title: text-lg font-semibold text-zinc-100 mb-4
- App row: flex items-center gap-3 py-2.5
- Rank text (1st): text-lg font-bold text-amber-400 w-8 text-center
- Rank text (2nd): text-lg font-bold text-zinc-300 w-8 text-center
- Rank text (3rd): text-lg font-bold text-amber-700 w-8 text-center
- Rank text (4th+): text-lg font-bold text-zinc-500 w-8 text-center
- App logo: w-6 h-6 rounded-lg object-cover
- App name: text-sm text-zinc-200 flex-1
- Percentage text: text-sm font-mono font-semibold w-14 text-right (color from getScoreColor)
- Progress bar track: h-2 flex-1 max-w-[200px] bg-zinc-800 rounded-full overflow-hidden
- Progress bar fill: h-full rounded-full (color from getScoreBgColor(percentage))
- Footer: flex items-center justify-between text-xs text-zinc-500 mt-4 pt-4 border-t border-zinc-800
- Footer link: text-indigo-400 hover:text-indigo-300 transition-colors
```

### Data Completion Table

```
- Card: bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6
- Section title: text-lg font-semibold text-zinc-100 p-6 pb-0 mb-4
- Table: w-full text-sm
- Header row: bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider
- Header cell: px-6 py-3
- Body row: border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors
- App cell: px-6 py-3 flex items-center gap-3
- App logo: w-6 h-6 rounded-lg object-cover
- App name: text-sm text-zinc-200 cursor-pointer hover:text-indigo-400 transition-colors
- Results cell: px-6 py-3 text-sm font-mono text-zinc-300
- Progress bar cell: px-6 py-3
- Progress bar track: h-2 w-full max-w-[200px] bg-zinc-800 rounded-full overflow-hidden
- Progress bar fill: h-full rounded-full
  - ≥80% complete: bg-emerald-500
  - ≥40% complete: bg-amber-500
  - <40% complete: bg-rose-500
- Percentage cell: px-6 py-3 text-sm font-mono
  - ≥80%: text-emerald-400
  - ≥40%: text-amber-400
  - <40%: text-rose-400
  - 0%: text-zinc-600
```

### Quick Action Cards

```
- Grid: grid grid-cols-1 md:grid-cols-3 gap-4
- Card: bg-zinc-900 border border-zinc-800 rounded-xl p-5
       hover:border-zinc-700 transition-colors cursor-pointer block
       (entire card is a <Link>)
- Card title: text-sm font-semibold text-zinc-100 mb-1
- Card description: text-xs text-zinc-400
- Card subtext (dynamic): text-xs text-zinc-500 mt-2
```

### Loading Skeleton

```
- Stats cards skeleton: 3 cards (h-28 bg-zinc-800/50 rounded-xl animate-pulse)
- Leaderboard skeleton: 1 card (h-64 bg-zinc-800/50 rounded-xl animate-pulse)
- Completion table skeleton: 1 card (h-48 bg-zinc-800/50 rounded-xl animate-pulse)
- Quick actions skeleton: 3 cards (h-24 bg-zinc-800/50 rounded-xl animate-pulse)
```

---

## Routing

No routing changes needed — the route already exists from Spec 02:

- `/` → `DashboardPage` (index route in `App.jsx`)

The sidebar already has the Dashboard entry as the first nav item.

---

## Loading and Error Handling

### Loading States

- **Full page loading**: While the two fetch waves are in progress, show skeleton placeholders for all four sections. The page header (title + subtitle) remains visible during loading. Uses the render helper pattern (`renderSkeleton`, `renderError`, `renderContent`).

### Error States

- **Full page error**: If any fetch fails, show a centered error card with the error message and a "Retry" button that re-triggers all fetches. The page header remains visible.
- **Graceful degradation for scores**: If the scoring fetch fails but other fetches succeed, the Dashboard still renders — the Leaderboard Summary section shows a small inline error ("Unable to load scoring data") instead of blocking the entire page. This is the one exception to "full page error" — scores are supplementary, not critical.

### Empty States

- **No apps registered**: Stats cards show "0 apps tracked", "0 / 0 results", "X / 50 golden results". The Leaderboard Summary shows the empty message. The Data Completion table is hidden. Quick Actions prominently suggest "Add App".
- **Apps exist but no results**: Stats show counts. Leaderboard Summary shows all apps at 0%. Data Completion table shows all apps at 0/50. Quick Actions suggest "Enter Results".
- **No golden results**: Leaderboard Summary shows "No scoring data available yet. Define golden results to enable scoring." with link. Stats card shows "0 / 50 golden results defined".

---

## UI/UX Considerations

- **Information hierarchy**: The page is organized top-to-bottom by priority. Stats cards give the quick numbers, the Leaderboard Summary shows the competitive picture, Data Completion shows the operational state, and Quick Actions provide next steps.
- **Desktop-first**: The Dashboard is designed for desktop (1200px+). On tablet/mobile, the 3-column grids collapse to 1 column. No horizontal scrolling needed.
- **No auto-refresh**: Data is fetched once on mount. Browser refresh to see updated data. This is consistent with all other pages in the app.
- **Minimal computation**: All aggregation (counting results per app, computing percentages) happens in the component after data is fetched. With ≤10 apps × 50 queries, this is negligible.
- **Score data is optional**: The Leaderboard Summary section gracefully handles the case where scoring fails (e.g., backend error). The rest of the Dashboard still renders. This makes the page resilient.
- **Quick Actions as onboarding**: For a new user with no data, the Quick Actions section effectively serves as a guided workflow: first add an app, then enter results, then define golden results. The dynamic descriptions adapt to the current state.
- **Cross-navigation**: App names in the Leaderboard Summary and Data Completion table are clickable, linking to the App Detail page. Quick Action cards link to their respective pages. The "View full leaderboard" link goes to `/leaderboard`.
- **Reuses existing constants**: Score colors use `getScoreColor` and `getScoreBgColor` from `src/constants/scoreColors.js` — no new constants needed.
- **No new components**: The Dashboard is self-contained in `DashboardPage.jsx`. The sections are simple enough that extracting them into separate components would add indirection without benefit. If the page grows in the future, sections can be extracted then.
- **Consistent with project patterns**: Uses the render helper pattern (`renderSkeleton`, `renderError`, `renderContent`) per `CLAUDE.md` and `00-guidelines.md`. Uses `Link` from React Router for navigation. Uses Tailwind classes consistent with the dark theme.

---

## Implementation Plan

- [x] **Step 1 — Implement data loading:** Replace the `DashboardPage` placeholder. Add state variables (`apps`, `results`, `goldenResults`, `scoreData`, `loading`, `error`). Implement the two-wave fetch pattern with `useEffect`. Add `renderSkeleton`, `renderError`, `renderContent` helper functions.
- [x] **Step 2 — Build Stats Cards section:** Compute aggregated stats (app count, total results, results percentage, golden count, golden percentage). Render three stat cards in a responsive grid.
- [x] **Step 3 — Build Leaderboard Summary section:** Render ranked app list from `scoreData.apps` with rank medals, logos, names, percentages, and progress bars. Add golden coverage footer with link to `/leaderboard`. Handle empty/error states.
- [x] **Step 4 — Build Data Completion section:** Compute per-app result counts. Render a table with progress bars and percentages, sorted by completion. App names link to `/apps/{appId}`. Hide section when no apps exist.
- [x] **Step 5 — Build Quick Actions section:** Render three action cards linking to `/apps`, `/apps`, and `/golden`. Dynamic descriptions based on current data state.
- [x] **Step 6 — Handle empty and error states:** All empty states implemented inline within each section render helper. Graceful degradation for scores (fetchScores catches errors, returns null, leaderboard shows inline error).
- [x] **Step 7 — Smoke test:** Lint and build pass. No new files created — only DashboardPage.jsx modified.

---

## Future Considerations (Out of Scope)

- **Recent activity feed**: Show the last 5–10 actions (results entered, golden results defined, apps added) as a timeline.
- **Category breakdown on Dashboard**: Show a mini chart of score distribution by query category (currently only on Leaderboard page).
- **Data freshness indicators**: Show "last updated" timestamps for each app's results.
- **Guided setup wizard**: A step-by-step onboarding flow for first-time users instead of static Quick Action cards.
- **Dashboard customization**: Allow users to rearrange or hide dashboard sections.
- **Export summary**: Export dashboard stats as a one-page PDF report.

---

## Issues & Learnings

### Clarifications from validation review (2026-02-08)

1. **Leaderboard progress bar color**: Uses `getScoreBgColor(percentage)` — not the inline solid-color thresholds that were in the styling section. Updated styling section to match.
2. **Leaderboard app names are clickable**: `<Link>` to `/apps/{appId}`, consistent with the Data Completion table. Added to Section 2 description.
3. **Scores fetch graceful degradation**: `fetchScores()` is wrapped in a try/catch returning `null` on failure, inside the same `Promise.all` as Wave 1. This prevents a scores error from rejecting the entire batch. Updated Data Fetching Strategy.
4. **"Enter Results" links to `/apps`**: Intended — user picks an app from the list, then navigates to Results Entry from the App Detail page. No deep-linking to a specific app.
5. **Quick Actions has no section heading**: Just the three cards, no title above them.

### Implementation findings (2026-02-08)

1. **`queries` state removed**: The spec listed `queries` as a state variable and included `fetchQueries()` in Wave 1, but no Dashboard section actually reads the queries data (the total query count is always hardcoded as 50). Removed the state, the import, and the fetch call to fix the `no-unused-vars` lint error. If query data is needed in the future (e.g., category breakdown), it can be added back.

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-08 | Spec 09 drafted — Dashboard |
| 2026-02-08 | Spec 09 implemented — all 7 steps complete |
