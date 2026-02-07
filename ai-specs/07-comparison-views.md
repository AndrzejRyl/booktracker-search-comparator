# Spec 07 — Comparison Views

**Version:** 1.0
**Status:** Draft

---

## Overview

This spec defines the **Comparison Views** feature — the core analytical value of the application. It allows users to compare how different book-tracking apps performed across the 50 search queries. The page lives at `/compare` and provides three distinct sub-views:

1. **Side-by-Side** — Pick a query and a subset of apps, then see their screenshots and result lists next to each other.
2. **Query Matrix** — A heatmap-style grid with rows = queries, columns = apps. Cells show golden match counts color-coded by match percentage. Gives an at-a-glance overview of how well each app matches the expected results across all queries.
3. **Per-Query Breakdown** — A sortable, filterable table showing every query and each app's golden match count. Useful for identifying which apps are underperforming on specific queries or which queries need golden results defined.

All three views are **read-only**. They consume existing data from the apps, queries, results, and golden results APIs. No new backend endpoints are needed — this is a frontend-only spec.

---

## Dependencies

- **Spec 02 (Project Setup & Scaffolding)** — must be implemented. Provides routing, AppShell layout, API client, and mock infrastructure.
- **Spec 03 (Query Bank)** — must be implemented. Provides the 50 queries.
- **Spec 04 (App Management)** — must be implemented. Provides app data (names, logos).
- **Spec 05 (Results Entry)** — must be implemented. Provides search results data per app per query.
- **Spec 06 (Golden Results)** — must be implemented. Provides golden result data used in the Side-by-Side view for comparison context.

---

## Backend API

### No new endpoints needed

The Comparison Views page is entirely frontend. It consumes existing endpoints:

| Endpoint | Purpose in Compare page |
|---|---|
| `GET /api/apps` | Load all apps (names, logos) for column headers and selectors |
| `GET /api/queries` | Load all 50 queries for row labels and filters |
| `GET /api/results?appId=X` | Load results per app (used to build the comparison dataset) |
| `GET /api/golden` | Load all golden results (for Side-by-Side golden comparison) |

### New API requirement: `fetchAllResults()`

The current `fetchResults()` API function requires at least `appId` or `queryIndex`. For the comparison views, we need to fetch **all** results across all apps efficiently.

**Approach:** Fetch results per-app in parallel. On page mount, after fetching the apps list, fire `fetchResults(appId)` for each app concurrently via `Promise.all()`. This avoids needing a new "fetch all results" backend endpoint and works with both mock and real APIs.

```js
// In ComparePage, after fetching apps:
const allResults = await Promise.all(
  apps.map((app) => fetchResults(app._id))
);
// Flatten: allResults is array of arrays → flatten to single array
const results = allResults.flat();
```

This is efficient for the expected data volume (5–10 apps × 50 queries = 250–500 results max).

---

## Frontend API Module

### No new API module needed

The page uses existing API modules:

- `src/api/apps.js` — `fetchApps()`
- `src/api/queries.js` — `fetchQueries()`
- `src/api/results.js` — `fetchResults(appId)`
- `src/api/golden.js` — `fetchGoldenResults()`

No new functions are needed.

---

## Mock API Layer

### No new mock data or handlers needed

The existing mock data in `src/api/mock/` provides sufficient data for the comparison views:

- 5 mock apps
- 50 mock queries
- 7 mock results across 3 apps (app1: 4 results, app2: 2, app3: 1)
- 5 mock golden results

This is enough to demonstrate all three sub-views with a realistic mix of populated and empty cells.

### Mock handler update

The mock results handler currently requires either `appId` or `queryIndex`. The `getResults()` function in `mock/results.js` already accepts optional params (`getResults(appId = null, queryIndex = null)`), but `mock/index.js` throws if neither is provided. This needs a minor adjustment:

**Update `src/api/mock/index.js`:** Allow `GET /results?appId=X` without requiring both params. The current code already handles this correctly (it checks `if (!appId && !queryIndex)` and throws). Since we'll always pass `appId`, no actual change is needed.

---

## Frontend Pages

### Directory & File Structure (New/Modified Files)

```
src/
├── pages/
│   └── ComparePage.jsx             # MODIFIED — page shell, tab bar, data loading
├── components/
│   ├── SideBySideView.jsx          # NEW — Side-by-Side comparison sub-view
│   ├── QueryMatrixView.jsx         # NEW — Query Matrix heatmap sub-view
│   ├── BreakdownView.jsx           # NEW — Per-Query Breakdown table sub-view
│   └── ScreenshotLightbox.jsx      # NEW — fullscreen screenshot viewer overlay
├── constants/
│   └── compareViews.js             # NEW — view tab labels and keys
├── utils/
│   └── goldenMatch.js              # NEW — shared golden match helpers
```

### `ComparePage.jsx` — Comparison Views (`/compare`)

This is the main page shell. It owns the tab bar, data loading, and delegates rendering to three separate sub-view components: `SideBySideView`, `QueryMatrixView`, and `BreakdownView`. Each sub-view receives the loaded data as props.

**Layout — Top-level structure:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Compare                                                                  │
│  Compare search results across apps.                                      │
│                                                                           │
│  ┌──────────────────┬──────────────────┬───────────────────────┐         │
│  │  Side-by-Side    │  Query Matrix    │  Per-Query Breakdown  │         │
│  └──────────────────┴──────────────────┴───────────────────────┘         │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  (Sub-view content — varies by selected tab)                        │ │
│  │                                                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Tab bar:** A horizontal tab row at the top of the content area (below the page header). Three tabs: "Side-by-Side", "Query Matrix", "Per-Query Breakdown". The active tab has an indigo underline and brighter text. Tabs use URL search params (`?view=side-by-side`, `?view=matrix`, `?view=breakdown`) via `useSearchParams()` so the active view persists on page refresh and is linkable. Default is `side-by-side`.

**Data loading:**

On mount, fetches all required data in a staged approach:

1. **First wave** — `Promise.all([fetchApps(), fetchQueries(), fetchGoldenResults()])`.
2. **Second wave** — After apps are loaded, fetch results per app: `Promise.all(apps.map(a => fetchResults(a._id)))`, then flatten.

A single `loading` state covers both waves. The page shows a skeleton until all data is loaded.

**State (ComparePage — page shell):**

- `apps` — array of all app objects.
- `queries` — array of all 50 query objects.
- `results` — flat array of all result objects across all apps.
- `goldenResults` — array of all golden result objects.
- `loading` — boolean (initial page load).
- `error` — string or null.
- `activeView` — string from URL search params: `'side-by-side'` (default), `'matrix'`, or `'breakdown'`.

The `?query=X` search param is **read once on mount** (matching the existing pattern in `GoldenPage` and `ResultsEntryPage`) and passed as `initialQueryIndex` prop to `SideBySideView`. Changing the query dropdown does NOT update the URL — it only changes local state within the sub-view.

**State (SideBySideView — sub-view component):**

- `selectedQueryIndex` — number or null (initialized from `initialQueryIndex` prop).
- `selectedAppIds` — array of app `_id` strings (which apps to include in the comparison).
- `lightbox` — object or null. When non-null, the `ScreenshotLightbox` is open. Shape: `{ screenshots: string[], initialIndex: number, appName: string }`.

**Props passed to sub-views:** All sub-views receive `{ apps, queries, results, goldenResults }`. `SideBySideView` also receives `initialQueryIndex`.

---

### Sub-view 1: Side-by-Side

**Purpose:** Pick a single query and a subset of apps, then see their result lists next to each other with the golden result as reference.

**Layout:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Query: [ ▾ #1 — the hunger games         ]                              │
│  Apps:  [✓ Goodreads] [✓ Hardcover] [✓ StoryGraph] [ Uncover] ...        │
│                                                                           │
│  ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐    │
│  │  Golden Results   │  │  Goodreads         │  │  Hardcover        │    │
│  │                   │  │  [logo]            │  │  [logo]           │    │
│  │  1. The Hunger    │  │                    │  │                   │    │
│  │     Games —       │  │  1. The Hunger     │  │  1. The Hunger    │    │
│  │     Suzanne C.    │  │     Games —        │  │     Games —       │    │
│  │  2. Catching      │  │     Suzanne C.     │  │     Suzanne C.    │    │
│  │     Fire —        │  │  2. Catching       │  │  2. Catching      │    │
│  │     Suzanne C.    │  │     Fire —         │  │     Fire —        │    │
│  │  3. Mockingjay —  │  │     Suzanne C.     │  │     Suzanne C.    │    │
│  │     Suzanne C.    │  │  3. Mockingjay —   │  │                   │    │
│  │  4. The Ballad    │  │     Suzanne C.     │  │  [2 screenshots]  │    │
│  │     of Songbirds  │  │                    │  │                   │    │
│  │     —Suzanne C.   │  │  [1 screenshot]    │  │                   │    │
│  └───────────────────┘  └───────────────────┘  └───────────────────┘    │
│                                                                           │
│  ┌───────────────────┐                                                   │
│  │  StoryGraph       │                                                   │
│  │  [logo]           │                                                   │
│  │                   │                                                   │
│  │  1. The Hunger    │                                                   │
│  │     Games —       │                                                   │
│  │     Suzanne C.    │                                                   │
│  │                   │                                                   │
│  │  [1 screenshot]   │                                                   │
│  └───────────────────┘                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- **Query selector**: A `<select>` dropdown listing all 50 queries (index + text). Selecting a query updates the comparison cards below. Default: no query selected (shows instruction text "Select a query to compare results").
- **App selector**: A row of toggle buttons, one per app. Each button shows the app name and a checkbox-style indicator. Clicking toggles the app in/out of the comparison. All apps are **selected by default** when the page first loads. The toggle buttons show the app logo (small, 20×20) + name.
- **Comparison cards**: A responsive flex/grid layout of cards. The first card is always the **Golden Results** card (fixed, not toggleable). Remaining cards show each selected app's results for the chosen query. Cards wrap to multiple rows if needed (`flex flex-wrap gap-4`).

**Each comparison card contains:**

- **Header**: App name (or "Golden Results" for the golden card), app logo (except golden card).
- **Book list**: Ranked list of books (rank, title, author) — same rendering pattern as QueryDetailPage. If the app has no result for this query, show "No results" in muted text.
- **Screenshot thumbnails**: Small thumbnail grid at the bottom of the card (only for app results, not golden). Clicking a thumbnail opens the **ScreenshotLightbox** overlay showing the full-size image. If no screenshots, this section is omitted.
- **Match summary** (app cards only, when golden result exists): "X/Y matches" in the card header (muted). X = golden matches found, Y = total golden books. Omitted when no golden result exists for the query.

**Golden result highlighting in app cards:** When a book in an app's result list matches a book in the golden result set (by normalized title + author comparison), the matching book's rank number is shown in emerald-400 instead of the default zinc-500. This provides a quick visual signal of how well the app matched the golden standard. A **match summary** is shown in the card header: "X/Y matches" where X = golden matches found in the app's results and Y = total golden books. This is the key metric — it tells you at a glance how well each app performed.

**Golden match logic (shared across all three views):**

These helpers live in `src/utils/goldenMatch.js` so they can be imported by all three sub-view components without violating the react-refresh ESLint rule against mixed component + constant exports.

```js
// src/utils/goldenMatch.js
export function normalizeStr(s) {
  return s.toLowerCase().trim().replace(/['']/g, "'");
}

export function isGoldenMatch(book, goldenBooks) {
  return goldenBooks.some(
    (g) =>
      normalizeStr(g.title) === normalizeStr(book.title) &&
      normalizeStr(g.author) === normalizeStr(book.author)
  );
}

export function countGoldenMatches(resultBooks, goldenBooks) {
  return resultBooks.filter((book) => isGoldenMatch(book, goldenBooks)).length;
}
```

This is a simple exact match after normalization. Fuzzy matching is out of scope — it would be part of the Scoring spec (Spec 08). These functions are used in all three sub-view components: SideBySideView (per-book highlighting + card summary), QueryMatrixView (cell values), and BreakdownView (cell values).

**Golden Results card — when no golden result exists for the selected query:**

The Golden Results card always renders as the first card. When no golden result is defined for the query, it shows:
- Header: "Golden Results"
- Body: "No golden results defined for this query." (muted italic text)
- Link: "Define in Golden Editor →" linking to `/golden?query={queryIndex}`

When no golden result exists, the golden match highlighting in app cards is disabled — all rank numbers show in the default zinc-500. The match summary in app card headers is omitted.

**Empty states:**

- No query selected: "Select a query above to compare results across apps."
- Query selected but no apps selected: "Select at least one app to see comparison results."
- Query selected, apps selected, but no results exist for any selected app: The golden card still shows (with books or "not defined" message), and each app card shows "No results for this query".

---

### `ScreenshotLightbox.jsx` — Fullscreen Screenshot Viewer

A reusable modal overlay component for viewing screenshots at full size without leaving the page. Used in the Side-by-Side comparison cards.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `screenshots` | string[] | Array of screenshot URLs (the full set for the current card) |
| `initialIndex` | number | Index of the screenshot to show first (the one the user clicked) |
| `onClose` | function | Called when the lightbox is dismissed |
| `appName` | string | App name shown in the lightbox header for context |

**Layout:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  (dark backdrop — bg-black/80)                                            │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Goodreads — Screenshot 1 of 3                              [ × ] │  │
│  │                                                                    │  │
│  │                                                                    │  │
│  │         ┌────────────────────────────────────┐                     │  │
│  │   [◀]   │                                    │   [▶]               │  │
│  │         │        (full-size screenshot)       │                     │  │
│  │         │                                    │                     │  │
│  │         └────────────────────────────────────┘                     │  │
│  │                                                                    │  │
│  │                       ● ○ ○                                        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- **Backdrop**: Semi-transparent dark overlay (`bg-black/80`). Clicking the backdrop closes the lightbox.
- **Close button**: `×` button in the top-right corner. Pressing `Escape` also closes.
- **Scroll locking**: When open, `document.body.style.overflow = 'hidden'`. Restored on close (via `useEffect` cleanup). Same pattern as `AppFormModal`.
- **Navigation arrows**: Left (`◀`) and right (`▶`) buttons to cycle through the screenshots array. Hidden when there's only one screenshot. Left arrow hidden on first image, right arrow hidden on last image.
- **Keyboard navigation**: Left/right arrow keys navigate between screenshots. Escape closes.
- **Header text**: Shows `"{appName} — Screenshot {current} of {total}"`.
- **Dot indicators**: Small dots below the image showing position in the set. Active dot is filled (white), inactive dots are dimmed (zinc-500).
- **Image display**: The screenshot is displayed with `max-w-full max-h-[80vh] object-contain` so it fills available space without distortion or cropping. Centered both horizontally and vertically.

**State:**

- `currentIndex` — number (initialized from `initialIndex`).

---

### Sub-view 2: Query Matrix

**Purpose:** An at-a-glance heatmap showing how well each app's results match the golden standard across all queries. Rows = queries, columns = apps. Cells show the number of golden matches and are color-coded by match quality. This is the primary tool for spotting which apps perform well and which queries are problematic.

**Layout:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Category: [ All ▾ ]                                                      │
│                                                                           │
│  ┌─────┬──────────────────┬──────┬────────┬────────┬────────┬────────┐  │
│  │  #  │  Query           │  ★   │  GR    │  HC    │  SG    │  LT    │  │
│  ├─────┼──────────────────┼──────┼────────┼────────┼────────┼────────┤  │
│  │  1  │  the hunger ga…  │  4   │  3/4   │  2/4   │  1/4   │   —    │  │
│  │  2  │  pride and pre…  │  2   │  1/2   │   —    │   —    │   —    │  │
│  │  3  │  colleen hoover  │  —   │   ·    │   ·    │        │        │  │
│  │  …  │  …               │  …   │  …     │  …     │  …     │  …     │  │
│  │  7  │  harry poter     │  5   │   —    │  3/5   │   —    │   —    │  │
│  │  …  │  …               │  …   │  …     │  …     │  …     │  …     │  │
│  │ 21  │  icebreaker ha…  │  2   │  1/2   │   —    │   —    │   —    │  │
│  │  …  │  …               │  …   │  …     │  …     │  …     │  …     │  │
│  └─────┴──────────────────┴──────┴────────┴────────┴────────┴────────┘  │
│                                                                           │
│  Legend: — no result  · has result, no golden  ██ <50%  ███ 50-99%       │
│          ████ 100% match                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- **Category filter dropdown**: Same category filter as QueriesPage — filters rows by query category. Default: "All Categories" (`value=""`), showing all 50 rows. Uses `CATEGORY_LABELS` from `src/constants/queryCategories.js`.
- **Table structure**: Fixed left columns (query index + text + golden count), scrollable right columns (one per app). The table container uses `overflow-x-auto` so it scrolls horizontally when there are many apps.
- **Column headers**: Show the app's logo (24×24) only, with a tooltip (`title` attribute) showing the full app name. No text abbreviation — the logo is sufficient and avoids ambiguous 2-letter codes. The header row is sticky (`sticky top-0 z-10`).
- **Golden column (★)**: A special column between the query text and app columns. Shows the total number of golden books defined for that query. If no golden result exists, shows "—" in zinc-600. This gives context for interpreting the app cells — it's the denominator.
- **Row headers**: Query index (font-mono) + query text (truncated). First three columns (index, text, golden) are sticky (`sticky left-0 z-10`) so they remain visible during horizontal scrolling.
- **Cell rendering**: Each app cell represents a single app + query combination. The cell value and color depend on whether golden results exist for that query:

  **When golden results exist for the query:**
  - Cell shows `X/Y` where X = number of the app's books that match golden books, Y = total golden books.
  - Color is based on match percentage (X/Y):
    - **No result for this app+query**: `bg-zinc-800/30`, shows "—" in zinc-600
    - **0% matches** (result exists but 0 golden matches): `bg-rose-900/30 text-rose-300`
    - **1–49% matches**: `bg-amber-900/40 text-amber-300`
    - **50–99% matches**: `bg-emerald-900/40 text-emerald-300`
    - **100% matches** (all golden books found): `bg-emerald-700/50 text-emerald-100`

  **When no golden results exist for the query:**
  - If the app has a result: shows "·" (middle dot) in `text-zinc-500` with `bg-zinc-800/50` — indicates data exists but can't be scored.
  - If the app has no result: shows "—" in `text-zinc-600` with `bg-zinc-800/30` — no data at all.

- **Cell interaction**: Clicking a cell navigates to the Side-by-Side view for that query. This is done by updating the URL params via `setSearchParams`: `?view=side-by-side&query={queryIndex}`. ComparePage reads the updated `query` param and passes it as `initialQueryIndex` to `SideBySideView`, which initializes its `selectedQueryIndex` state from that prop.
- **Row interaction**: Clicking the query text in a row navigates to `/queries/{index}` (the Query Detail page).

**Legend:** Below the table, a small horizontal legend explains the symbols and color coding.

---

### Sub-view 3: Per-Query Breakdown

**Purpose:** A detailed sortable table showing every query and how many golden results each app matched. More data-dense than the matrix — shows the exact match counts with sorting and filtering. This is the primary tool for identifying which apps are underperforming on specific queries.

**Layout:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────┐  Category: [ All ▾ ]                            │
│  │ 🔍 Search queries... │                                                 │
│  └──────────────────────┘                                                 │
│                                                                           │
│  ┌─────┬──────────────────┬───────────┬──────┬────────┬────────┬────────┐│
│  │  #  │  Query           │  Category │  ★   │  GR ▼  │  HC    │  SG    ││
│  ├─────┼──────────────────┼───────────┼──────┼────────┼────────┼────────┤│
│  │  1  │  the hunger ga…  │  baseline │  4   │  3/4   │  2/4   │  1/4   ││
│  │  2  │  pride and pre…  │  baseline │  2   │  1/2   │  —     │  —     ││
│  │  5  │  gone girl       │  baseline │  2   │  1/2   │  —     │  —     ││
│  │  7  │  harry poter     │  typo     │  5   │  —     │  3/5   │  —     ││
│  │ 21  │  icebreaker ha…  │  rom-ind. │  2   │  1/2   │  —     │  —     ││
│  │  …  │  …               │  …        │  …   │  …     │  …     │  …     ││
│  └─────┴──────────────────┴───────────┴──────┴────────┴────────┴────────┘│
│                                                                           │
│  Showing 50 of 50 queries                                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- **Search filter**: Text search across query text and description (same as QueriesPage), debounced to 300ms.
- **Category filter**: Same dropdown as QueriesPage and Query Matrix.
- **Table columns**:
  - `#` — Query index (sortable, ascending/descending).
  - `Query` — Query text (font-mono, truncated). Clickable — navigates to `/queries/{index}`.
  - `Category` — Category badge (using `QueryCategoryBadge` component).
  - `★` — Golden book count for the query. Shows "—" in zinc-600 if no golden result is defined. This column provides context — it's the denominator for all app columns.
  - **One column per app**: Column header shows app logo (24×24) with tooltip for full name (same as Query Matrix). Cell content depends on golden result availability:

    **When golden results exist for the query:**
    - Shows `X/Y` where X = number of the app's books that match golden books and Y = total golden books.
    - Cell text color based on match percentage:
      - `X === Y` (100% match): `text-emerald-400`
      - `X > 0 && X < Y` (partial match): `text-amber-400`
      - `X === 0` (result exists but zero matches): `text-rose-400`
      - No result for this app+query: "—" in `text-zinc-600`

    **When no golden results exist for the query:**
    - If the app has a result: "·" in `text-zinc-500` — indicates data exists but can't be scored.
    - If the app has no result: "—" in `text-zinc-600`.

- **Sorting**: Click column headers to sort. Default sort: ascending by query index (#). Clicking an app column sorts by that app's golden match count (descending, then ascending on second click). When sorting by an app column, queries without golden results **and** queries where the app has no result both sort to the bottom. Visual sort indicator: `▲` or `▼` in the header.
- **Row click**: Clicking the query text navigates to `/queries/{index}`. Clicking an app's cell navigates to the Side-by-Side view with that query pre-selected.
- **Row count**: "Showing X of 50 queries" at the bottom, reflecting active filters.

---

## Constants

### `src/constants/compareViews.js`

View tab keys and labels.

```js
export const COMPARE_VIEWS = {
  SIDE_BY_SIDE: 'side-by-side',
  MATRIX: 'matrix',
  BREAKDOWN: 'breakdown',
};

export const COMPARE_VIEW_LABELS = {
  [COMPARE_VIEWS.SIDE_BY_SIDE]: 'Side-by-Side',
  [COMPARE_VIEWS.MATRIX]: 'Query Matrix',
  [COMPARE_VIEWS.BREAKDOWN]: 'Per-Query Breakdown',
};
```

---

## Routing

No routing changes needed — the route already exists from Spec 02:

- `/compare` → `ComparePage`
- `/compare?view=side-by-side` → Side-by-Side sub-view (default)
- `/compare?view=matrix` → Query Matrix sub-view
- `/compare?view=breakdown` → Per-Query Breakdown sub-view
- `/compare?view=side-by-side&query=7` → Side-by-Side with query #7 pre-selected

The active view and selected query are managed via `useSearchParams()`, making views linkable and persistent across page refreshes.

---

## Styling

All styling uses **Tailwind CSS 4** classes consistent with the dark theme.

### Tab Bar

```
- Tab container: flex border-b border-zinc-800 mb-6
- Tab (inactive): px-4 py-2.5 text-sm text-zinc-400 hover:text-zinc-200
                   border-b-2 border-transparent transition-colors cursor-pointer
- Tab (active): px-4 py-2.5 text-sm text-zinc-100
                border-b-2 border-indigo-400 transition-colors
```

### Side-by-Side View

```
- Selector row: flex flex-wrap items-center gap-4 mb-6
- Query dropdown: bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2
                  text-sm text-zinc-100 min-w-[300px]
                  focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
- App toggle button (unselected): bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
                                  text-xs text-zinc-400 cursor-pointer transition-colors
                                  hover:border-zinc-600
- App toggle button (selected): bg-indigo-900/30 border border-indigo-700/50 rounded-lg px-3 py-1.5
                                text-xs text-indigo-300 cursor-pointer transition-colors
- App toggle logo: w-5 h-5 rounded object-cover inline-block mr-1.5
- Comparison cards container: flex flex-wrap gap-4
- Comparison card: bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-72 shrink-0
- Card header: flex items-center gap-2 mb-3
- Card app logo: w-6 h-6 rounded-lg object-cover
- Card app name: text-sm font-semibold text-zinc-100
- Card match summary (with golden): text-xs text-zinc-500 ml-auto (e.g., "3/4 matches")
- Card match summary (no golden): omitted
- Book list: space-y-1
- Book item: flex items-baseline gap-2 text-sm
- Book rank (normal): text-zinc-500 font-mono w-5 text-right shrink-0
- Book rank (golden match): text-emerald-400 font-mono w-5 text-right shrink-0
- Book title: text-zinc-200 text-xs
- Book dash: text-zinc-600
- Book author: text-zinc-400 text-xs
- No result text: text-zinc-500 italic text-sm
- Screenshot thumbnails: flex flex-wrap gap-1.5 mt-3
- Screenshot thumb: w-12 h-12 rounded border border-zinc-700 object-cover cursor-pointer
                    hover:border-indigo-500 transition-colors
- Golden card: bg-zinc-900 border border-indigo-800/30 rounded-xl p-5 w-72 shrink-0
              (slightly different border to distinguish from app cards)
- Golden card empty text: text-zinc-500 italic text-sm
- Golden card editor link: text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block
- Instruction text: text-zinc-500 text-sm italic text-center py-12
```

### Query Matrix View

```
- Matrix container: overflow-x-auto
- Table: w-full border-collapse text-sm
- Table header row: sticky top-0 z-10 bg-zinc-900
- Column header cell: px-3 py-2 text-center
- Column header logo: w-6 h-6 rounded object-cover mx-auto (with title attr for tooltip)
- Golden column header (★): text-amber-400 text-xs font-bold
- Row header cells (sticky): sticky left-0 z-10 bg-zinc-900
- Query index cell: w-10 px-2 py-1.5 text-zinc-500 font-mono text-xs text-right
- Query text cell: max-w-[180px] px-2 py-1.5 text-zinc-300 font-mono text-xs truncate
                   cursor-pointer hover:text-indigo-400 transition-colors
- Golden count cell: w-10 px-2 py-1.5 text-amber-400/70 font-mono text-xs text-center
- Data cell: w-16 h-10 text-center cursor-pointer transition-colors
- Data cell (no result): bg-zinc-800/30 text-zinc-600
- Data cell (has result, no golden defined): bg-zinc-800/50 text-zinc-500
- Data cell (0% match): bg-rose-900/30 text-rose-300
- Data cell (<50% match): bg-amber-900/40 text-amber-300
- Data cell (50-99% match): bg-emerald-900/40 text-emerald-300
- Data cell (100% match): bg-emerald-700/50 text-emerald-100
- Data cell hover: hover:ring-1 hover:ring-indigo-400/50 hover:ring-inset
- Cell text: text-xs font-mono
- Legend container: flex items-center gap-4 mt-4 text-xs text-zinc-500
- Legend swatch: w-4 h-4 rounded inline-block
- Category filter: same styling as QueriesPage dropdown
```

### Per-Query Breakdown View

```
- Filter row: flex flex-wrap items-center gap-4 mb-4
- Search input: same styling as QueriesPage
- Category dropdown: same styling as QueriesPage
- Table container: bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto
- Table header: bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider
- Sortable header: cursor-pointer hover:text-zinc-200 transition-colors select-none
- Sort indicator: text-indigo-400 ml-1
- Golden column header (★): text-amber-400
- Body rows: border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors
- Query text cell: font-mono text-zinc-100 text-sm cursor-pointer hover:text-indigo-400
- Category cell: (uses QueryCategoryBadge component)
- Golden count cell: text-amber-400/70 text-sm font-mono
- App result cell (100% match — X === Y): text-emerald-400 text-sm font-mono
- App result cell (partial match — X > 0, X < Y): text-amber-400 text-sm font-mono
- App result cell (zero match — X === 0, result exists): text-rose-400 text-sm font-mono
- App result cell (has result, no golden defined): text-zinc-500 text-sm
- App result cell (no result): text-zinc-600 text-sm
- Row count: text-zinc-500 text-sm mt-4
```

### Screenshot Lightbox

```
- Backdrop: fixed inset-0 bg-black/80 z-50 flex items-center justify-center
- Container: relative w-full max-w-5xl mx-auto px-4
- Header: flex items-center justify-between mb-4
- Header text: text-sm text-zinc-300
- Close button: text-zinc-400 hover:text-white text-2xl cursor-pointer
               transition-colors w-8 h-8 flex items-center justify-center
- Image container: flex items-center justify-center
- Image: max-w-full max-h-[80vh] object-contain rounded-lg
- Nav button: absolute top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70
              text-white w-10 h-10 rounded-full flex items-center justify-center
              text-lg cursor-pointer transition-colors
- Nav button (left): left-2
- Nav button (right): right-2
- Nav button (hidden): hidden (when at start/end of array)
- Dot indicators container: flex items-center justify-center gap-2 mt-4
- Dot (active): w-2 h-2 rounded-full bg-white
- Dot (inactive): w-2 h-2 rounded-full bg-zinc-500
```

### Loading Skeleton

```
- Tab bar skeleton: 3 skeleton tabs (h-8 w-28 bg-zinc-800/50 rounded animate-pulse inline-block)
- Side-by-Side skeleton: selector row skeleton + 3 card skeletons
- Matrix skeleton: 5 rows × 5 cols of h-10 w-16 bg-zinc-800/50 rounded animate-pulse blocks
- Breakdown skeleton: 5 skeleton table rows (h-10 bg-zinc-800/50 rounded animate-pulse mb-1)
```

---

## Loading and Error Handling

### Loading States

- **Full page loading**: While the initial data fetches are in progress, show a skeleton with the page header visible and the tab bar as skeleton blocks. The active tab's content area shows the appropriate skeleton for that view.
- **No per-view loading**: Once all data is loaded, switching between tabs is instant (client-side filtering/rendering, no additional API calls).

### Error States

- **Full page error**: If any of the initial fetches fail, show a centered error card with the error message and a "Retry" button that re-triggers all fetches. The page header and tab bar remain visible.
- **No partial error handling**: If one fetch fails, the entire page shows an error. This is a simplification — partial data would create a confusing UX with missing columns or rows.

### Empty States

- **No apps registered**: "No apps have been registered yet. Add your first app to start comparing." with a link to `/apps`.
- **No results for any app**: "No results have been recorded yet. Start entering results for your apps to see comparisons." with a link to `/apps`.
- **Side-by-Side, no query selected**: "Select a query above to compare results across apps." (centered, italic, muted).
- **Side-by-Side, no apps toggled on**: "Select at least one app to see comparison results." (centered, italic, muted).

---

## UI/UX Considerations

- **Desktop-first**: The comparison views are designed for wide screens (1200px+). The Query Matrix may require horizontal scrolling on narrower screens. The Side-by-Side cards wrap naturally with `flex-wrap`. The Per-Query Breakdown table uses `overflow-x-auto`.
- **No auto-refresh**: Data is fetched once on page mount. To see updated results, the user must refresh the page. A manual "Refresh" button is not included — browser refresh suffices.
- **Tab persistence**: The active tab is stored in URL search params, so it persists across page refreshes and is shareable/bookmarkable.
- **Cross-view navigation**: Clicking a cell in the Query Matrix or Per-Query Breakdown navigates to the Side-by-Side view for that query via `setSearchParams`. Since SideBySideView initializes `selectedQueryIndex` from the `initialQueryIndex` prop (read from URL on mount), it will correctly pick up the new query when the view switches. This cross-linking makes the matrix and breakdown effective entry points for detailed comparison.
- **Golden-centric design**: The entire comparison system is built around golden results as the scoring reference. The Matrix and Breakdown views show golden match counts, not raw book counts (since nearly every result has 9 books — the count is meaningless). The Side-by-Side view highlights golden matches per-book and shows a match summary per card. When golden results aren't defined for a query, the views degrade gracefully: Matrix/Breakdown cells show "·" (data exists but can't be scored) and the Side-by-Side golden card shows a prompt to define golden results. The views still *work* without golden data, but their analytical value is limited.
- **Golden match logic**: All three sub-view components import `normalizeStr`, `isGoldenMatch`, and `countGoldenMatches` from `src/utils/goldenMatch.js` for consistency. The matching uses simple normalized string comparison — not fuzzy matching. This is consistent with the fact that the Scoring spec (Spec 08) will define the formal scoring algorithm.
- **Screenshot lightbox**: Clicking a screenshot thumbnail opens a fullscreen lightbox overlay with the image at full size. The lightbox supports navigating between multiple screenshots via arrows and keyboard. This keeps the user on the page and provides a much better viewing experience than opening screenshots in separate tabs. The lightbox component is built as a reusable `ScreenshotLightbox` component in `src/components/` so it can be adopted by other pages (e.g., QueryDetailPage, ResultsEntryPage) in the future.
- **App logos in Matrix/Breakdown headers**: Column headers show the app logo (24×24) only, with the full name as a tooltip. No text abbreviation — logos are more recognizable and avoid ambiguous 2-letter codes. With 5–10 apps expected, this keeps columns compact.
- **Sorting in Breakdown**: Only one column can be sorted at a time. Clicking a different column resets the sort direction. This keeps the UX simple and predictable.
- **Keyboard accessibility**: Tab buttons are standard `<button>` elements. Table rows are navigable via Tab. Dropdown selects and text inputs are standard HTML. The app toggle buttons in Side-by-Side use `<button>` with `aria-pressed` for accessibility.
- **Performance**: With 50 queries × 10 apps = 500 cells max, the matrix and breakdown table render instantly. No virtualization needed. The initial data fetch is the only potentially slow operation.

---

## Implementation Plan

- [ ] **Step 1 — Create constants and utils:** Create `src/constants/compareViews.js` with view keys and labels. Create `src/utils/goldenMatch.js` with `normalizeStr`, `isGoldenMatch`, `countGoldenMatches`.
- [ ] **Step 2 — Build page shell and tab bar:** Replace ComparePage placeholder with the page header, tab bar (reading/writing URL search params via `useSearchParams`), and a `renderContent()` that delegates to the active sub-view component. Read `?query=X` param once on mount and pass as `initialQueryIndex` to SideBySideView.
- [ ] **Step 3 — Implement data loading:** Add `useEffect` that fetches apps, queries, golden results (first wave), then fetches all results per-app (second wave). Add loading/error states with skeleton and error card.
- [ ] **Step 4 — Build ScreenshotLightbox component:** Create `src/components/ScreenshotLightbox.jsx` — backdrop, close on Escape/backdrop click, scroll lock, arrow navigation, keyboard nav, dot indicators, header text.
- [ ] **Step 5 — Build SideBySideView component:** Create `src/components/SideBySideView.jsx` — query selector dropdown, app toggle buttons, comparison cards with book lists, golden highlighting, screenshot thumbnails with lightbox integration. Handle empty states.
- [ ] **Step 6 — Build QueryMatrixView component:** Create `src/components/QueryMatrixView.jsx` — heatmap table with sticky headers, logo-only column headers with tooltips, color-coded cells, category filter, legend, cell click navigation to Side-by-Side.
- [ ] **Step 7 — Build BreakdownView component:** Create `src/components/BreakdownView.jsx` — sortable table with search, category filter, logo-only column headers, app result columns showing X/Y format, column sorting (no-golden and no-result rows sort to bottom), row click navigation.
- [ ] **Step 8 — Wire cross-view navigation:** Ensure clicking a matrix/breakdown cell switches to Side-by-Side with the correct query pre-selected via `setSearchParams`. Ensure `initialQueryIndex` is passed through correctly.
- [ ] **Step 9 — Smoke test:** Verify all three views work with mock API. Test tab switching, query selection, app toggling, matrix cell clicks, sorting, filtering, lightbox navigation. Lint and build pass.

---

## Future Considerations (Out of Scope)

- **Position-weighted scoring in matrix**: Once the Scoring spec (Spec 08) defines position-weighted scoring, the matrix cells could show the weighted score instead of simple match counts.
- **Export comparison data**: Export the matrix or breakdown table as CSV/PDF.
- **App column reordering**: Drag columns to rearrange the order of apps in the matrix/breakdown.
- **Filter by result status**: Filter matrix/breakdown to show only queries where at least one app has results, or where results are missing.
- **Fuzzy match highlighting**: Use the same fuzzy matching algorithm as Scoring (Spec 08) for the Side-by-Side golden highlighting instead of exact match.
- **Row grouping in matrix**: Group rows by category with collapsible headers.
- **Sticky tab bar**: Make the tab bar sticky on scroll for long content areas.
- **Side-by-Side screenshot comparison**: Show screenshots from different apps side-by-side in a dedicated comparison layout.

---

## Issues & Learnings

*(To be filled during implementation)*

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-07 | Spec 07 drafted — Comparison Views |
| 2026-02-07 | Spec validated — clarifications resolved: (1) golden match helpers → `src/utils/goldenMatch.js`, (2) sub-views extracted to separate components (`SideBySideView`, `QueryMatrixView`, `BreakdownView`), (3) `?query=X` read once on mount (not synced), (4) app column headers use logo-only with tooltip (no text abbreviation), (5) no-golden and no-result rows sort to bottom in Breakdown, (6) category "All" uses `value=""` matching QueriesPage |
