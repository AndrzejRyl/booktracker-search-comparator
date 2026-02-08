# Spec 10 — Codebase Cleanup & DRY Refactoring

**Version:** 1.1
**Status:** Draft

---

## Overview

This spec identifies repeated patterns, duplicated code, and cleanup opportunities across the entire codebase (frontend pages, components, API layer, mock API, backend routes, and utilities). The goal is to apply the DRY principle, improve readability, and bring the code to a high maintainability standard — without changing any existing functionality.

---

## 1. Frontend — Extract Shared Components

### 1.1 `BookListEditor` component (HIGH PRIORITY)

The **entire book editor UI** — manual add/remove, JSON import, manual/JSON tab toggle — is copy-pasted between `ResultsEntryPage.jsx` and `GoldenPage.jsx`. This is ~300 lines of identical code duplicated across two files.

**Duplicated elements (verified identical in both files):**
- `renderBooksManual()` — identical in both (list of books + add-book form inputs)
- `renderBooksJson()` — identical in both (textarea, error, apply button)
- `renderBooks()` — identical in both (header with count, manual/JSON tab toggle)
- `handleAddBook()` — identical logic
- `handleAddBookKeyDown()` — identical logic
- `handleRemoveBook()` — identical logic
- `handleSwitchToJson()` — identical logic
- `handleApplyJson()` — identical JSON validation and parsing logic (~40 lines duplicated verbatim)
- State: `books`, `bookInputMode`, `jsonInput`, `jsonError`, `newBookTitle`, `newBookAuthor`

**Proposed solution:** Extract a `BookListEditor` component to `src/components/BookListEditor.jsx`.

```jsx
// Props:
// - books: array of { rank, title, author }
// - onChange: (newBooks) => void
// - maxBooks: number (default 9)

export default function BookListEditor({ books, onChange, maxBooks = 9 }) {
  // All internal state: bookInputMode, jsonInput, jsonError, newBookTitle, newBookAuthor
  // All handlers: handleAddBook, handleRemoveBook, handleSwitchToJson, handleApplyJson
  // All render: manual list, JSON textarea, tab toggle
}
```

Both `ResultsEntryPage` and `GoldenPage` would then just render `<BookListEditor books={books} onChange={setBooks} />` and get all the editing UI for free.

**Files affected:**
- Create: `src/components/BookListEditor.jsx`
- Modify: `src/pages/ResultsEntryPage.jsx` (~150 lines removed)
- Modify: `src/pages/GoldenPage.jsx` (~150 lines removed)

---

### 1.2 `ErrorCard` component (MEDIUM PRIORITY)

Nearly every page has a `renderError()` function with the same structure:

```jsx
<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
  <p className="text-red-400 mb-4">{error}</p>
  <button onClick={onRetry} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors">
    Retry
  </button>
</div>
```

This pattern appears in 9 pages: `QueriesPage`, `AppsPage`, `AppDetailPage`, `ResultsEntryPage`, `GoldenPage`, `ComparePage`, `DashboardPage`, `LeaderboardPage`, `QueryDetailPage`. Minor variations exist (e.g., `LeaderboardPage` uses `border-red-800/50`, `DashboardPage` uses `text-rose-400`), but the core structure is identical.

Some pages (`AppDetailPage`, `QueryDetailPage`) render a back navigation link above the error card — those pages will continue to render the back link separately, outside of `ErrorCard`.

**Proposed solution:** Extract an `ErrorCard` component to `src/components/ErrorCard.jsx`.

```jsx
// Props:
// - message: string
// - onRetry: () => void (optional — renders Retry button if provided)
// - action: { label, to } (optional — renders a Link instead of Retry button)

export default function ErrorCard({ message, onRetry, action }) { }
```

**Files affected:**
- Create: `src/components/ErrorCard.jsx`
- Modify: All 9 page files (replace `renderError` with `<ErrorCard>`)

---

### 1.3 `EmptyState` component (MEDIUM PRIORITY)

Multiple pages have empty state cards with the same structure:

```jsx
<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
  <p className="text-zinc-500 mb-4">Some message</p>
  <button className="...">Some action</button>
</div>
```

Found in: `QueriesPage` (no matches), `AppsPage` (no apps), `LeaderboardPage` (no apps / no golden), `ComparePage` (no apps / no results).

**Proposed solution:** Extract an `EmptyState` component to `src/components/EmptyState.jsx`.

```jsx
// Props:
// - message: string
// - action: { label, onClick } | { label, to } (optional)

export default function EmptyState({ message, action }) { }
```

**Files affected:**
- Create: `src/components/EmptyState.jsx`
- Modify: `QueriesPage`, `AppsPage`, `LeaderboardPage`, `ComparePage`

---

### 1.4 `PageHeader` component (LOW PRIORITY)

Every page renders a header with the same pattern:

```jsx
<h1 className="text-2xl font-bold mb-2">Title</h1>
<p className="text-zinc-400 text-sm mb-6">Subtitle</p>
```

Some pages add `text-zinc-100` to the `<h1>`, some don't (it defaults via inheritance anyway). Some use `mb-1` instead of `mb-2`. The minor differences could be standardized.

**Proposed solution:** Extract a `PageHeader` component to `src/components/PageHeader.jsx`.

```jsx
// Props:
// - title: string
// - subtitle: string (optional)
// - children: ReactNode (optional — for extra info like progress counters)

export default function PageHeader({ title, subtitle, children }) { }
```

**Files affected:**
- Create: `src/components/PageHeader.jsx`
- Modify: All 8+ page files

---

## 2. Frontend — Shared Utility Functions

### 2.1 `formatDate` utility (HIGH PRIORITY)

The same `formatDate` function is defined inline in both `AppsPage.jsx` (line 30) and `AppDetailPage.jsx` (line 68):

```js
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};
```

It's also used inline in `QueryDetailPage.jsx` (line 141) with the same format options.

**Proposed solution:** Add to `src/utils/formatDate.js`:

```js
export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
```

**Files affected:**
- Create: `src/utils/formatDate.js`
- Modify: `AppsPage.jsx`, `AppDetailPage.jsx`, `QueryDetailPage.jsx`

---

### 2.2 `getRankColor` utility (MEDIUM PRIORITY)

A rank-to-color mapping is defined twice:

- `LeaderboardPage.jsx` line 45: `getRankColor(rank)` — returns `text-amber-400`, `text-zinc-300`, `text-amber-700`, `text-zinc-500`
- `DashboardPage.jsx` line 85: `getRankClass(rank)` — returns the same colors + `text-lg font-bold w-8 text-center` styling

The underlying color logic is the same. The Dashboard version also includes layout classes, which should stay in the component.

**Proposed solution:** Add to `src/constants/scoreColors.js` (where other score color helpers live):

```js
export function getRankColor(rank) {
  if (rank === 1) return 'text-amber-400';
  if (rank === 2) return 'text-zinc-300';
  if (rank === 3) return 'text-amber-700';
  return 'text-zinc-500';
}
```

**Files affected:**
- Modify: `src/constants/scoreColors.js` (add function)
- Modify: `LeaderboardPage.jsx`, `DashboardPage.jsx` (import shared function)

---

### 2.3 `useDebounce` custom hook (LOW PRIORITY)

`QueriesPage.jsx` manually implements debounced search with `useRef` + `setTimeout` + cleanup (lines 34–40). `BreakdownView.jsx` doesn't debounce search at all, but uses the same search/filter pattern.

**Proposed solution:** Create `src/hooks/useDebounce.js`:

```js
import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debouncedValue;
}
```

**Files affected:**
- Create: `src/hooks/useDebounce.js`
- Modify: `QueriesPage.jsx` (remove manual debounce ref logic)

---

### 2.4 Pluralize helper (LOW PRIORITY)

There are ~7 instances across the codebase using manual pluralization:

```js
result.books.length !== 1 ? 's' : ''    // QueryDetailPage x3
apps.length === 1 ? 'app' : 'apps'      // AppsPage
queriesScored === 1 ? 'query' : 'queries'  // LeaderboardPage
appsWithNoResults === 1 ? 'app has' : 'apps have'  // DashboardPage
```

**Proposed solution:** Add to `src/utils/pluralize.js`:

```js
export function pluralize(count, singular, plural) {
  return count === 1 ? singular : (plural || `${singular}s`);
}
```

---

## 3. Frontend — Unused Constant

### 3.1 Delete unused `resultStatus.js` (LOW PRIORITY)

`src/constants/resultStatus.js` defines `RESULT_STATUS`, `RESULT_STATUS_LABELS`, and `RESULT_STATUS_COLORS`. This file is **not imported anywhere** in the codebase. The result status display is handled inline where needed, which is simpler and preferred.

**Proposed solution:** Delete the file.

**Files affected:**
- Delete: `src/constants/resultStatus.js`

---

## 4. Backend — DRY Refactoring

### 4.1 Duplicated `normalizeStr` function (HIGH PRIORITY)

The `normalizeStr` function exists in two places:
- `src/utils/goldenMatch.js` line 1 (frontend)
- `server/routes/scores.js` line 9 (backend)

Both are identical: `s.toLowerCase().trim().replace(/['']/g, "'")`.

**Proposed solution:** For the backend, extract to `server/utils/scoring.js` and import it. This keeps the frontend/backend copies separate (they're in different runtimes) but ensures the backend route file stays focused on routing, not utility logic.

```js
// server/utils/scoring.js
export function normalizeStr(s) {
  return s.toLowerCase().trim().replace(/['']/g, "'");
}

export function computeQueryScore(resultBooks, goldenBooks) {
  // move from routes/scores.js
}
```

**Files affected:**
- Create: `server/utils/scoring.js`
- Modify: `server/routes/scores.js` (import functions, remove inline definitions)

---

### 4.2 Duplicated scoring logic in `GET /api/scores` and `GET /api/scores/:appId` (HIGH PRIORITY)

In `server/routes/scores.js`, the two route handlers (`GET /` at line 44 and `GET /:appId` at line 139) share ~40 lines of near-identical scoring logic:

- Build `queryMap` from queries
- Compute `maxPossibleScore` by summing golden book counts
- Iterate golden results, call `computeQueryScore`, accumulate totals
- Aggregate `categoryScores` with the same structure
- Compute category percentages

The main difference: `GET /` loops over all apps, while `GET /:appId` processes a single app.

**Proposed solution:** Extract a shared `computeAppScore(appResults, goldenResults, queryMap)` function to `server/utils/scoring.js`:

```js
export function computeAppScore(appResults, goldenResults, queryMap) {
  const resultMap = new Map(appResults.map((r) => [r.queryIndex, r]));
  let totalScore = 0;
  const queryScores = [];
  const categoryScores = {};
  let queriesWithResults = 0;

  for (const r of appResults) {
    if (r.books && r.books.length > 0) queriesWithResults++;
  }

  for (const golden of goldenResults) {
    const result = resultMap.get(golden.queryIndex);
    const detail = computeQueryScore(result?.books || [], golden.books);
    totalScore += detail.score;
    queryScores.push({ queryIndex: golden.queryIndex, ...detail });

    const query = queryMap.get(golden.queryIndex);
    if (query) {
      if (!categoryScores[query.category]) {
        categoryScores[query.category] = { totalScore: 0, maxScore: 0, queriesScored: 0 };
      }
      categoryScores[query.category].totalScore += detail.score;
      categoryScores[query.category].maxScore += detail.maxScore;
      categoryScores[query.category].queriesScored += 1;
    }
  }

  for (const cat of Object.values(categoryScores)) {
    cat.percentage = cat.maxScore > 0 ? Math.round((cat.totalScore / cat.maxScore) * 1000) / 10 : 0;
  }

  return { totalScore, queryScores, categoryScores, queriesWithResults };
}
```

**Files affected:**
- Modify: `server/utils/scoring.js` (add function)
- Modify: `server/routes/scores.js` (both handlers call shared function, ~40 lines removed)

---

### 4.3 Global error handling middleware + asyncHandler (MEDIUM PRIORITY)

Every backend route handler wraps its body in:

```js
try { ... } catch (err) { res.status(500).json({ message: err.message }); }
```

This is 2 lines of boilerplate per handler, repeated 16 times across the 5 route files. Errors are also handled inconsistently — some routes return `500`, but there's no centralized place to log errors or handle unexpected cases.

**Proposed solution (two parts):**

**Part A — Global error-handling middleware** in `server/middleware/errorHandler.js`:

Register a single error-handling middleware at the end of the Express middleware chain in `server/index.js`. This catches any error passed via `next(err)` and returns a consistent JSON response.

```js
// server/middleware/errorHandler.js
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  if (status === 500) {
    console.error(`[Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(status).json({ message });
}
```

```js
// server/index.js (at the end, after all routes)
import { errorHandler } from './middleware/errorHandler.js';
// ... route registrations ...
app.use(errorHandler);
```

**Part B — `asyncHandler` wrapper** in `server/utils/asyncHandler.js`:

Wraps async route handlers so that rejected promises are automatically forwarded to `next()`, which the global error handler catches.

```js
// server/utils/asyncHandler.js
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

Usage — route handlers become clean with no try/catch:
```js
router.get('/', asyncHandler(async (req, res) => {
  const apps = await App.find().sort({ name: 1 });
  res.json(apps);
}));
```

For expected errors (validation, not-found), handlers can throw with a status:
```js
const app = await App.findById(req.params.id);
if (!app) {
  const err = new Error('App not found');
  err.status = 404;
  throw err;
}
```

**Files affected:**
- Create: `server/middleware/errorHandler.js`
- Create: `server/utils/asyncHandler.js`
- Modify: `server/index.js` (register error handler middleware)
- Modify: All 5 route files (wrap handlers, remove try/catch blocks)

---

### 4.4 `queryIndex` validation (LOW PRIORITY)

The same validation `isNaN(qIndex) || qIndex < 1 || qIndex > 50` is repeated in:
- `server/routes/results.js` line 52
- `server/routes/golden.js` line 21 and line 39

**Proposed solution:** Create a shared validation helper:

```js
// server/utils/validators.js
export function validateQueryIndex(queryIndex, maxIndex = 50) {
  const n = Number(queryIndex);
  if (isNaN(n) || n < 1 || n > maxIndex) return null;
  return n;
}
```

---

## 5. Mock API — Cleanup

### 5.1 Regex route matching duplication (LOW PRIORITY)

In `src/api/mock/index.js`, the same regex is matched multiple times for different HTTP methods (e.g., `/apps/:id` is matched separately for GET, PUT, and DELETE at lines 38, 46, 52). Each creates its own regex match.

**Proposed solution:** Refactor to match the path once, then branch on method:

```js
const appIdMatch = path.match(/^\/apps\/([a-zA-Z0-9]+)$/);
if (appIdMatch) {
  const id = appIdMatch[1];
  if (method === 'GET') { ... }
  if (method === 'PUT') { ... }
  if (method === 'DELETE') { ... }
}
```

**Files affected:**
- Modify: `src/api/mock/index.js`

---

## 6. CSS Class Standardization

### 6.1 Card container classes (LOW PRIORITY)

The card pattern `bg-zinc-900 border border-zinc-800 rounded-xl` appears ~51 times across the codebase. Could be abstracted:

```css
@layer components {
  .card { @apply bg-zinc-900 border border-zinc-800 rounded-xl; }
}
```

---

### 6.2 Table header classes (LOW PRIORITY)

Table headers consistently use: `bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider`. This appears in `QueriesPage`, `AppDetailPage`, `BreakdownView`, `LeaderboardPage`, `DashboardPage`.

---

## 7. Book List Display (READ-ONLY)

### 7.1 Book display rendering (MEDIUM PRIORITY)

A read-only book list display (rank, title, author) is rendered in at least 4 places with the same structure:

- `QueryDetailPage.jsx` — `renderGoldenResults()` line 131, `renderAppResult()` line 177
- `SideBySideView.jsx` — `renderGoldenCard()` line 43, `renderAppCard()` line 82

The markup:
```jsx
<div className="flex items-baseline gap-2 text-sm">
  <span className="text-zinc-500 font-mono w-5 text-right shrink-0">{book.rank}.</span>
  <span className="text-zinc-200">{book.title}</span>
  <span className="text-zinc-600">&mdash;</span>
  <span className="text-zinc-400">{book.author}</span>
</div>
```

**Proposed solution:** Extract a `BookListDisplay` component to `src/components/BookListDisplay.jsx`:

```jsx
// Props:
// - books: array of { rank, title, author }
// - highlightFn: (book) => boolean (optional — for golden match highlighting)

export default function BookListDisplay({ books, highlightFn }) { }
```

**Files affected:**
- Create: `src/components/BookListDisplay.jsx`
- Modify: `QueryDetailPage.jsx`, `SideBySideView.jsx`

---

## 8. Bug Fixes & Anti-Patterns

### 8.1 `<a href>` instead of `<Link>` in a SPA (HIGH PRIORITY — BUG)

Several places use raw `<a href="...">` instead of React Router's `<Link>`. This causes a full page reload, destroying all React state and defeating the purpose of a SPA.

**Instances:**
- `ComparePage.jsx` line 112: `<a href="/apps">`
- `ComparePage.jsx` line 121: `<a href="/apps">`
- `SideBySideView.jsx` line 28: `<a href={'/golden?query=...'}>`

**Fix:** Replace with `<Link to="...">` from `react-router-dom`.

**Files affected:**
- Modify: `src/pages/ComparePage.jsx`
- Modify: `src/components/SideBySideView.jsx`

---

### 8.2 Clickable `<div>`/`<tr>` with `role="link"` instead of real links (MEDIUM PRIORITY)

In `QueriesPage.jsx` (line 134) and `AppsPage.jsx` (line 82), clickable rows/cards are built as `<div>`/`<tr>` elements with `onClick`, `onKeyDown`, `tabIndex={0}`, and `role="link"` to simulate link behavior.

This approach has real usability problems:
- **Right-click → "Open in new tab" doesn't work** — users get the generic context menu
- **URL doesn't show in status bar** on hover
- **Screen readers** handle `role="link"` on a `<div>` less reliably than a real `<a>`

**Proposed solution:** Use CSS to stretch a `<Link>` across the entire clickable area via `::after` positioning. This preserves the current UX (entire card/row is clickable) while gaining proper link behavior (right-click, status bar URL, screen reader support).

For card grids (`AppsPage`), wrap the card in a `<Link>` with `relative` positioning and full coverage. For table rows (`QueriesPage`), add a `<Link>` in the primary text cell and stretch it across the row using `::after { content: ''; position: absolute; inset: 0; }`.

**Files affected:**
- Modify: `src/pages/QueriesPage.jsx`
- Modify: `src/pages/AppsPage.jsx`

---

### 8.3 No route-level code splitting (LOW PRIORITY)

All 10 page components are eagerly imported in `App.jsx`. With `React.lazy()` + `Suspense`, each page becomes a separate chunk that loads on demand.

**Current:**
```jsx
import DashboardPage from './pages/DashboardPage';
import AppsPage from './pages/AppsPage';
// ... 8 more eager imports
```

**Proposed:**
```jsx
import { lazy, Suspense } from 'react';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AppsPage = lazy(() => import('./pages/AppsPage'));
// ...
```

With a `<Suspense fallback={<LoadingSpinner />}>` wrapper around the `<Outlet>` in `AppShell.jsx`.

Not critical at this app's size, but it's standard practice and sets up good habits for growth.

**Files affected:**
- Modify: `src/App.jsx`
- Modify: `src/layouts/AppShell.jsx` (add `Suspense` wrapper)

---

## Implementation Plan

Implementation should proceed in phases, with each phase independently testable.

### Phase 0 — Bug fixes (do first)
- [ ] 8.1 Replace `<a href>` with `<Link>` in `ComparePage` and `SideBySideView`

### Phase 1 — High-impact DRY extractions
- [ ] 1.1 Extract `BookListEditor` component
- [ ] 2.1 Extract `formatDate` utility
- [ ] 4.1 Extract `normalizeStr` + `computeQueryScore` to `server/utils/scoring.js`
- [ ] 4.2 Extract `computeAppScore` to consolidate scoring route logic

### Phase 2 — Shared UI components
- [ ] 1.2 Extract `ErrorCard` component
- [ ] 1.3 Extract `EmptyState` component
- [ ] 7.1 Extract `BookListDisplay` component (read-only)
- [ ] 8.2 Replace clickable `<div>`/`<tr>` with real `<Link>` elements

### Phase 3 — Backend cleanup
- [ ] 4.3 Add global error handler middleware + `asyncHandler` wrapper
- [ ] 4.4 Extract `validateQueryIndex` helper

### Phase 4 — Utilities & low-priority cleanup
- [ ] 2.2 Extract `getRankColor` to `scoreColors.js`
- [ ] 2.3 Create `useDebounce` hook
- [ ] 1.4 Extract `PageHeader` component
- [ ] 2.4 Create `pluralize` helper
- [ ] 3.1 Delete unused `resultStatus.js`
- [ ] 5.1 Refactor mock API routing
- [ ] 6.1 Create `card` CSS utility class
- [ ] 6.2 Create `table-header` CSS utility class
- [ ] 8.3 Add route-level code splitting with `React.lazy`

### Testing strategy
After each phase:
1. Run `npm run lint` to verify no lint errors
2. Run `npm run build` to verify no build errors
3. Manual smoke test: navigate all pages, verify functionality unchanged
4. For backend changes: test all API endpoints via the running app

---

## Summary of Impact

| Metric | Estimate |
|--------|----------|
| Bugs fixed | 1 (`<a href>` in SPA) |
| Anti-patterns resolved | 2 (fake link divs, no code splitting) |
| Dead code removed | 1 file (`resultStatus.js`) |
| Lines removed (duplication eliminated) | ~350–400 |
| New shared components created | 5 (`BookListEditor`, `ErrorCard`, `EmptyState`, `PageHeader`, `BookListDisplay`) |
| New utility files created | 3 (`formatDate.js`, `useDebounce.js`, `scoring.js`) |
| New backend files created | 2 (`errorHandler.js`, `asyncHandler.js`) |
| Pages simplified | 8 of 9 |
| Backend routes simplified | 5 of 5 (try/catch boilerplate removed) |

The highest-impact item is **BookListEditor** (Section 1.1) — it eliminates ~300 lines of exactly-duplicated code between two pages. Second is the **backend scoring consolidation** (Section 4.2) which removes ~40 lines of duplicated business logic. Phase 0 bug fix (Section 8.1) should be done first as it addresses actual incorrect behavior.

---

## Issues & Learnings

_(To be filled during implementation)_

---

## Future Considerations (Out of Scope)

- Adding automated tests (unit tests for extracted components/utilities)
- Migrating to TypeScript for improved type safety
- Component library or design system formalization
- Performance optimizations (React.memo, virtualized lists for large datasets)
