# Spec 08 — Scoring & Leaderboard

**Version:** 1.0
**Status:** Implemented

---

## Overview

This spec defines the **Scoring & Leaderboard** feature — the mechanism for computing, persisting, and displaying how well each app's search results match the golden standard. It covers:

1. Implementing **backend scoring endpoints** (`GET /api/scores`, `GET /api/scores/:appId`) — computed on-the-fly from results and golden results data.
2. Building the **frontend Leaderboard page** (`/leaderboard`) — a ranked table of apps with overall scores, per-category breakdowns, and drill-down to per-query detail.
3. **Adding a sidebar navigation entry** for the Leaderboard.
4. Creating the **mock API layer** for scoring so frontend development works without a running backend.
5. Adding a **scoring API module** on the frontend (`src/api/scores.js`).

> **Note:** The Dashboard page (`/`) remains a placeholder stub in this spec. It will be built in **Spec 09 (Dashboard)**, which aggregates stats, leaderboard summary, and quick actions — and depends on this spec.

Scoring is **computed, not stored** — the backend calculates scores on every request from current results and golden data. This avoids data staleness and keeps the data model simple.

---

## Dependencies

- **Spec 02 (Project Setup & Scaffolding)** — must be implemented. Provides Express skeleton, Mongoose connection, API client, mock infrastructure, routing, and AppShell layout.
- **Spec 03 (Query Bank)** — must be implemented. Provides the 50 queries.
- **Spec 04 (App Management)** — must be implemented. Provides app data.
- **Spec 05 (Results Entry)** — must be implemented. Provides app results.
- **Spec 06 (Golden Results)** — must be implemented. Provides golden result data as scoring ground truth.

> **Note:** Spec 07 (Comparison Views) is **not** a dependency. The Leaderboard stands alone. However, there is a shared utility (`goldenMatch.js`) already used by Spec 07's comparison views. The scoring algorithm in this spec extends the same normalization logic but adds position-weighted scoring.

---

## Scoring Algorithm

The scoring algorithm computes a score for each app on each query, based on how well the app's results match the golden results. The algorithm has two components: **hit scoring** (which golden books appear in the app's results) and **position bonus** (whether they appear at the expected rank).

### Per-Query Score

For each query Q and app A:

- Let `golden(Q)` = ordered list of golden books for query Q (up to 9).
- Let `results(A, Q)` = ordered list of result books app A returned for query Q (up to 9).

**Hit score:** For each book in `golden(Q)`, if it appears anywhere in `results(A, Q)` (matched by normalized title + author, using the same `normalizeStr` from `goldenMatch.js`), add **1 point**.

**Position bonus:** For each golden book that is also a hit, if it appears at the **same rank or higher** (lower rank number = better position) in `results(A, Q)`, add **0.5 bonus points**. Specifically: if golden book has rank `gRank` and the matching result book has rank `rRank`, the bonus is awarded when `rRank <= gRank`.

**Per-query score** = hit score + position bonus.

**Per-query maximum** = `goldenCount * 1.5` (every golden book found at its rank or better).

**Example:**

Golden for query #1 (4 books):
1. The Hunger Games — Suzanne Collins
2. Catching Fire — Suzanne Collins
3. Mockingjay — Suzanne Collins
4. The Ballad of Songbirds and Snakes — Suzanne Collins

App results for query #1 (3 books):
1. The Hunger Games — Suzanne Collins → hit (1pt) + position bonus (rank 1 <= golden rank 1) (+0.5pt) = 1.5
2. Catching Fire — Suzanne Collins → hit (1pt) + position bonus (rank 2 <= golden rank 2) (+0.5pt) = 1.5
3. Mockingjay — Suzanne Collins → hit (1pt) + position bonus (rank 3 <= golden rank 3) (+0.5pt) = 1.5

Score: 4.5 / 6.0 max (3 hits + 3 position bonuses, out of 4 possible golden books × 1.5)

### Special Cases

- **No golden result defined for query**: Query is **excluded** from scoring entirely. It does not count toward the total or penalize any app. This means the maximum possible total score depends on how many queries have golden results defined.
- **No result for app+query**: Score is **0** for that query. The query still counts toward the total (if golden exists), representing a gap in the app's coverage.
- **Result exists but 0 matches**: Score is **0** for that query.
- **Empty golden books (0 books)**: Same as "no golden defined" — query excluded.
- **Identical book appearing multiple times in results**: Only the first occurrence is matched. Each golden book can only match once.

### Aggregate Score

**Total score** for an app = sum of per-query scores across all queries that have golden results.

**Maximum possible score** = sum of `goldenCount(Q) * 1.5` for each query Q that has golden results.

**Percentage** = `(totalScore / maxPossible) * 100`, rounded to 1 decimal place.

### Per-Category Score

For each category (e.g., "baseline", "typo", "romance-indie"):

- Sum per-query scores for queries in that category that have golden results.
- Sum max possible for those queries.
- Compute category percentage.

This enables category-level comparison: "App A excels at baseline queries but struggles with typos."

---

## Backend API

### New Routes — `server/routes/scores.js`

Scoring is computed on-the-fly from Results and GoldenResult collections. No dedicated scoring collection — this avoids stale data and keeps the data model simple.

#### `GET /api/scores`

Returns the leaderboard: all apps ranked by total score, with per-category breakdowns.

**Response:** `200 OK`

```json
{
  "maxPossibleScore": 22.5,
  "goldenCoverage": 5,
  "totalQueries": 50,
  "apps": [
    {
      "appId": "app1",
      "appName": "Goodreads",
      "appLogo": "/uploads/logos/goodreads.png",
      "rank": 1,
      "totalScore": 7.5,
      "maxScore": 22.5,
      "percentage": 33.3,
      "queriesScored": 5,
      "queriesWithResults": 4,
      "categoryScores": {
        "baseline": { "totalScore": 6.0, "maxScore": 12.0, "percentage": 50.0, "queriesScored": 3 },
        "romance-trad": { "totalScore": 1.5, "maxScore": 3.0, "percentage": 50.0, "queriesScored": 1 }
      },
      "queryScores": [
        { "queryIndex": 1, "hits": 3, "positionBonuses": 3, "score": 4.5, "maxScore": 6.0, "goldenCount": 4 },
        { "queryIndex": 2, "hits": 1, "positionBonuses": 1, "score": 1.5, "maxScore": 3.0, "goldenCount": 2 },
        { "queryIndex": 5, "hits": 1, "positionBonuses": 1, "score": 1.5, "maxScore": 3.0, "goldenCount": 2 },
        { "queryIndex": 7, "hits": 0, "positionBonuses": 0, "score": 0, "maxScore": 7.5, "goldenCount": 5 },
        { "queryIndex": 19, "hits": 0, "positionBonuses": 0, "score": 0, "maxScore": 3.0, "goldenCount": 2 }
      ]
    },
    {
      "appId": "app2",
      "appName": "Hardcover",
      "appLogo": "/uploads/logos/hardcover.png",
      "rank": 2,
      "totalScore": 6.0,
      "maxScore": 22.5,
      "percentage": 26.7,
      "queriesScored": 5,
      "queriesWithResults": 2,
      "categoryScores": {
        "baseline": { "totalScore": 3.0, "maxScore": 12.0, "percentage": 25.0, "queriesScored": 3 },
        "typo": { "totalScore": 3.0, "maxScore": 7.5, "percentage": 40.0, "queriesScored": 1 }
      },
      "queryScores": [
        { "queryIndex": 1, "hits": 2, "positionBonuses": 2, "score": 3.0, "maxScore": 6.0, "goldenCount": 4 },
        { "queryIndex": 2, "hits": 0, "positionBonuses": 0, "score": 0, "maxScore": 3.0, "goldenCount": 2 },
        { "queryIndex": 5, "hits": 0, "positionBonuses": 0, "score": 0, "maxScore": 3.0, "goldenCount": 2 },
        { "queryIndex": 7, "hits": 3, "positionBonuses": 3, "score": 4.5, "maxScore": 7.5, "goldenCount": 5 },
        { "queryIndex": 19, "hits": 0, "positionBonuses": 0, "score": 0, "maxScore": 3.0, "goldenCount": 2 }
      ]
    }
  ]
}
```

**Top-level fields:**

| Field | Type | Description |
|---|---|---|
| `maxPossibleScore` | number | Sum of `goldenCount * 1.5` across all queries with golden results. Same for all apps |
| `goldenCoverage` | number | Number of queries that have golden results defined (with at least 1 book) |
| `totalQueries` | number | Always 50 |
| `apps` | array | All apps, sorted by `totalScore` descending (rank 1 = highest) |

**Per-app fields:**

| Field | Type | Description |
|---|---|---|
| `appId` | string | App `_id` |
| `appName` | string | App name |
| `appLogo` | string | App logo URL |
| `rank` | number | Leaderboard rank (1-indexed). Apps with the same score share the same rank |
| `totalScore` | number | Sum of per-query scores |
| `maxScore` | number | Maximum possible score (same as `maxPossibleScore`) |
| `percentage` | number | `(totalScore / maxScore) * 100`, rounded to 1 decimal |
| `queriesScored` | number | Number of queries with golden results (denominator context) |
| `queriesWithResults` | number | Number of queries where this app has a result entry |
| `categoryScores` | object | Per-category breakdown (key = category string, value = score object) |
| `queryScores` | array | Per-query score details, sorted by `queryIndex` |

#### `GET /api/scores/:appId`

Returns the detailed scoring breakdown for a single app. Same shape as a single entry in the `apps` array from `GET /api/scores`, but also includes query text and category for convenience.

> **Note:** This endpoint does **not** compute the `rank` field (to avoid fetching all apps and all results). The rank is only computed by `GET /api/scores` (the leaderboard endpoint). The frontend should obtain the rank from the leaderboard data. The `rank` field is omitted from this response.

**Response:** `200 OK`

```json
{
  "appId": "app1",
  "appName": "Goodreads",
  "appLogo": "/uploads/logos/goodreads.png",
  "totalScore": 7.5,
  "maxScore": 22.5,
  "percentage": 33.3,
  "queriesScored": 5,
  "queriesWithResults": 4,
  "categoryScores": {
    "baseline": { "totalScore": 6.0, "maxScore": 12.0, "percentage": 50.0, "queriesScored": 3 },
    "romance-trad": { "totalScore": 1.5, "maxScore": 3.0, "percentage": 50.0, "queriesScored": 1 }
  },
  "queryScores": [
    { "queryIndex": 1, "queryText": "the hunger games", "category": "baseline", "hits": 3, "positionBonuses": 3, "score": 4.5, "maxScore": 6.0, "goldenCount": 4 },
    { "queryIndex": 2, "queryText": "pride and prejudice", "category": "baseline", "hits": 1, "positionBonuses": 1, "score": 1.5, "maxScore": 3.0, "goldenCount": 2 }
  ]
}
```

**Error:** `404 Not Found` if no app exists with the given ID.

```json
{ "message": "App not found" }
```

### Route Registration

In `server/index.js`, import and mount the scoring router:

```js
import scoresRouter from './routes/scores.js';

// After existing routes:
app.use('/api/scores', scoresRouter);
```

### Route Implementation — Conceptual

```js
import { Router } from 'express';
import App from '../models/App.js';
import Result from '../models/Result.js';
import GoldenResult from '../models/GoldenResult.js';
import Query from '../models/Query.js';

const router = Router();

function normalizeStr(s) {
  return s.toLowerCase().trim().replace(/['']/g, "'");
}

function computeQueryScore(resultBooks, goldenBooks) {
  if (!goldenBooks || goldenBooks.length === 0) {
    return { hits: 0, positionBonuses: 0, score: 0, maxScore: 0, goldenCount: 0 };
  }
  const goldenCount = goldenBooks.length;
  const maxScore = goldenCount * 1.5;
  let hits = 0;
  let positionBonuses = 0;

  if (!resultBooks || resultBooks.length === 0) {
    return { hits: 0, positionBonuses: 0, score: 0, maxScore, goldenCount };
  }

  for (const gBook of goldenBooks) {
    const match = resultBooks.find(
      (r) =>
        normalizeStr(r.title) === normalizeStr(gBook.title) &&
        normalizeStr(r.author) === normalizeStr(gBook.author)
    );
    if (match) {
      hits += 1;
      if (match.rank <= gBook.rank) {
        positionBonuses += 1;
      }
    }
  }

  return { hits, positionBonuses, score: hits + positionBonuses * 0.5, maxScore, goldenCount };
}

// GET /api/scores
router.get('/', async (req, res) => {
  try {
    const [apps, queries, goldenResults, allResults] = await Promise.all([
      App.find().sort({ name: 1 }),
      Query.find().sort({ index: 1 }),
      GoldenResult.find({ 'books.0': { $exists: true } }).sort({ queryIndex: 1 }),
      Result.find(),
    ]);

    const goldenMap = new Map(goldenResults.map((g) => [g.queryIndex, g]));
    const queryMap = new Map(queries.map((q) => [q.index, q]));

    // Compute max possible score
    let maxPossibleScore = 0;
    for (const g of goldenResults) {
      maxPossibleScore += g.books.length * 1.5;
    }

    // Build per-app scores
    const appScores = apps.map((app) => {
      const appResults = allResults.filter((r) => r.appId.toString() === app._id.toString());
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

        queryScores.push({
          queryIndex: golden.queryIndex,
          ...detail,
        });

        // Category aggregation
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

      // Compute category percentages
      for (const cat of Object.values(categoryScores)) {
        cat.percentage = cat.maxScore > 0 ? Math.round((cat.totalScore / cat.maxScore) * 1000) / 10 : 0;
      }

      return {
        appId: app._id,
        appName: app.name,
        appLogo: app.logo,
        totalScore,
        maxScore: maxPossibleScore,
        percentage: maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 1000) / 10 : 0,
        queriesScored: goldenResults.length,
        queriesWithResults,
        categoryScores,
        queryScores: queryScores.sort((a, b) => a.queryIndex - b.queryIndex),
      };
    });

    // Sort by totalScore desc, assign ranks (shared ranks for ties)
    appScores.sort((a, b) => b.totalScore - a.totalScore);
    let currentRank = 1;
    for (let i = 0; i < appScores.length; i++) {
      if (i > 0 && appScores[i].totalScore < appScores[i - 1].totalScore) {
        currentRank = i + 1;
      }
      appScores[i].rank = currentRank;
    }

    res.json({
      maxPossibleScore,
      goldenCoverage: goldenResults.length,
      totalQueries: 50,
      apps: appScores,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/scores/:appId
// Note: rank is NOT computed here — use GET /api/scores for ranks.
router.get('/:appId', async (req, res) => {
  try {
    const app = await App.findById(req.params.appId);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    const [queries, goldenResults, appResults] = await Promise.all([
      Query.find().sort({ index: 1 }),
      GoldenResult.find({ 'books.0': { $exists: true } }).sort({ queryIndex: 1 }),
      Result.find({ appId: req.params.appId }),
    ]);

    const queryMap = new Map(queries.map((q) => [q.index, q]));
    const resultMap = new Map(appResults.map((r) => [r.queryIndex, r]));

    let maxPossibleScore = 0;
    for (const g of goldenResults) {
      maxPossibleScore += g.books.length * 1.5;
    }

    let totalScore = 0;
    const queryScores = [];
    const categoryScores = {};
    let queriesWithResults = 0;

    for (const r of appResults) {
      if (r.books && r.books.length > 0) queriesWithResults++;
    }

    for (const golden of goldenResults) {
      const result = resultMap.get(golden.queryIndex);
      const query = queryMap.get(golden.queryIndex);
      const detail = computeQueryScore(result?.books || [], golden.books);
      totalScore += detail.score;

      queryScores.push({
        queryIndex: golden.queryIndex,
        queryText: query?.text || '',
        category: query?.category || '',
        ...detail,
      });

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

    res.json({
      appId: app._id,
      appName: app.name,
      appLogo: app.logo,
      totalScore,
      maxScore: maxPossibleScore,
      percentage: maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 1000) / 10 : 0,
      queriesScored: goldenResults.length,
      queriesWithResults,
      categoryScores,
      queryScores: queryScores.sort((a, b) => a.queryIndex - b.queryIndex),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
```

---

## Frontend API Module

### `src/api/scores.js`

A thin module that calls the API client for scoring endpoints.

```js
import { api } from './client.js';

export async function fetchScores() {
  return api.get('/scores');
}

export async function fetchAppScore(appId) {
  return api.get(`/scores/${appId}`);
}
```

**Notes:**
- `fetchScores()` returns the full leaderboard with all apps ranked.
- `fetchAppScore(appId)` returns detailed scoring for a single app, including query text and category in each query score entry.

---

## Mock API Layer

### `src/api/mock/scores.js`

Contains a mock scoring function that computes scores from the existing mock results and golden data, using the same algorithm. This ensures the frontend sees realistic, consistent scoring data.

```js
import { getResults } from './results.js';
import { getGoldenResults } from './golden.js';
import { getApps } from './apps.js';
import { getQueries } from './queries.js';

function normalizeStr(s) {
  return s.toLowerCase().trim().replace(/['']/g, "'");
}

function computeQueryScore(resultBooks, goldenBooks) {
  if (!goldenBooks || goldenBooks.length === 0) {
    return { hits: 0, positionBonuses: 0, score: 0, maxScore: 0, goldenCount: 0 };
  }
  const goldenCount = goldenBooks.length;
  const maxScore = goldenCount * 1.5;
  let hits = 0;
  let positionBonuses = 0;

  if (!resultBooks || resultBooks.length === 0) {
    return { hits: 0, positionBonuses: 0, score: 0, maxScore, goldenCount };
  }

  for (const gBook of goldenBooks) {
    const match = resultBooks.find(
      (r) =>
        normalizeStr(r.title) === normalizeStr(gBook.title) &&
        normalizeStr(r.author) === normalizeStr(gBook.author)
    );
    if (match) {
      hits += 1;
      if (match.rank <= gBook.rank) {
        positionBonuses += 1;
      }
    }
  }

  return { hits, positionBonuses, score: hits + positionBonuses * 0.5, maxScore, goldenCount };
}

export function getScores() {
  const apps = getApps();
  const queries = getQueries();
  const goldenResults = getGoldenResults();
  const queryMap = new Map(queries.map((q) => [q.index, q]));

  let maxPossibleScore = 0;
  for (const g of goldenResults) {
    maxPossibleScore += g.books.length * 1.5;
  }

  const appScores = apps.map((app) => {
    const appResults = getResults(app._id);
    const resultMap = new Map(appResults.map((r) => [r.queryIndex, r]));

    let totalScore = 0;
    const queryScores = [];
    const categoryScores = {};
    const queriesWithResults = appResults.filter((r) => r.books && r.books.length > 0).length;

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

    return {
      appId: app._id,
      appName: app.name,
      appLogo: app.logo,
      totalScore,
      maxScore: maxPossibleScore,
      percentage: maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 1000) / 10 : 0,
      queriesScored: goldenResults.length,
      queriesWithResults,
      categoryScores,
      queryScores: queryScores.sort((a, b) => a.queryIndex - b.queryIndex),
    };
  });

  appScores.sort((a, b) => b.totalScore - a.totalScore);
  let currentRank = 1;
  for (let i = 0; i < appScores.length; i++) {
    if (i > 0 && appScores[i].totalScore < appScores[i - 1].totalScore) {
      currentRank = i + 1;
    }
    appScores[i].rank = currentRank;
  }

  return {
    maxPossibleScore,
    goldenCoverage: goldenResults.length,
    totalQueries: 50,
    apps: appScores,
  };
}

export function getAppScore(appId) {
  const allScores = getScores();
  const appScore = allScores.apps.find((a) => a.appId === appId);
  if (!appScore) return null;

  // Enrich queryScores with queryText and category
  const queries = getQueries();
  const queryMap = new Map(queries.map((q) => [q.index, q]));

  // Remove rank — rank is only available from the leaderboard endpoint
  const { rank, ...scoreWithoutRank } = appScore;

  scoreWithoutRank.queryScores = scoreWithoutRank.queryScores.map((qs) => {
    const query = queryMap.get(qs.queryIndex);
    return { ...qs, queryText: query?.text || '', category: query?.category || '' };
  });

  return scoreWithoutRank;
}
```

**Notes:**
- The mock scoring module computes scores live from mock data — no hardcoded score values.
- Uses the same algorithm as the backend.
- `getResults(appId)` from `mock/results.js` returns results for a specific app (accepts null for no filter, but here we always pass an appId).

### Update `src/api/mock/index.js`

**Append** scoring route matching above the fallback, after the golden result routes:

```js
import { getScores, getAppScore } from './scores.js';

// Inside handleRequest, after golden result routes:

// --- Scoring routes ---

// GET /scores
if (method === 'GET' && path === '/scores') {
  return getScores();
}

// GET /scores/:appId
const scoreMatch = path.match(/^\/scores\/([a-zA-Z0-9]+)$/);
if (method === 'GET' && scoreMatch) {
  const result = getAppScore(scoreMatch[1]);
  if (!result) throw new Error('App not found');
  return result;
}
```

---

## Frontend Pages

### Directory & File Structure (New/Modified Files)

```
src/
├── api/
│   ├── scores.js                  # NEW — scoring API module
│   └── mock/
│       ├── index.js               # MODIFIED — add scoring route handlers
│       └── scores.js              # NEW — mock scoring computation
├── pages/
│   └── LeaderboardPage.jsx        # NEW — full leaderboard page
├── components/
│   └── Sidebar.jsx                # MODIFIED — add Leaderboard nav item
├── constants/
│   └── scoreColors.js             # NEW — score percentage color thresholds
├── App.jsx                        # MODIFIED — add /leaderboard route
server/
├── routes/
│   └── scores.js                  # NEW — scoring API routes
├── index.js                       # MODIFIED — register scoring router
```

### Constants

#### `src/constants/scoreColors.js`

Score percentage thresholds and their corresponding text colors, used in the Leaderboard page.

```js
export function getScoreColor(percentage) {
  if (percentage >= 80) return 'text-emerald-400';
  if (percentage >= 60) return 'text-emerald-300';
  if (percentage >= 40) return 'text-amber-400';
  if (percentage >= 20) return 'text-amber-300';
  return 'text-rose-400';
}

export function getScoreBgColor(percentage) {
  if (percentage >= 80) return 'bg-emerald-700/50';
  if (percentage >= 60) return 'bg-emerald-900/40';
  if (percentage >= 40) return 'bg-amber-900/40';
  if (percentage >= 20) return 'bg-amber-900/30';
  return 'bg-rose-900/30';
}
```

**Note:** These are functions, not constants, so they can live in `src/constants/` without violating the react-refresh rule (no component export in this file).

---

### `LeaderboardPage.jsx` — Leaderboard (`/leaderboard`)

The main leaderboard page. Shows all apps ranked by score with expandable per-query and per-category detail.

**Layout — Top-level structure:**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Leaderboard                                                              │
│  App rankings based on golden result matching.                            │
│  Golden coverage: 5 / 50 queries scored                                   │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Leaderboard Table                                                   │ │
│  │                                                                      │ │
│  │  ┌──────┬────────────────┬────────┬──────────┬──────────┬────────┐  │ │
│  │  │ Rank │ App            │ Score  │ Pct      │ Results  │ Detail │  │ │
│  │  ├──────┼────────────────┼────────┼──────────┼──────────┼────────┤  │ │
│  │  │  1   │ [logo] Goodre… │ 7.5    │ 33.3%    │ 4 / 5    │  [▼]  │  │ │
│  │  │  2   │ [logo] Hardco… │ 6.0    │ 26.7%    │ 2 / 5    │  [▼]  │  │ │
│  │  │  3   │ [logo] StoryG… │ 1.5    │  6.7%    │ 1 / 5    │  [▼]  │  │ │
│  │  │  3   │ [logo] Librar… │ 0.0    │  0.0%    │ 0 / 5    │  [▼]  │  │ │
│  │  │  3   │ [logo] Uncove… │ 0.0    │  0.0%    │ 0 / 5    │  [▼]  │  │ │
│  │  └──────┴────────────────┴────────┴──────────┴──────────┴────────┘  │ │
│  │                                                                      │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Category Comparison                                                 │ │
│  │                                                                      │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │ │
│  │  │ Bestseller Baseline │  │ Typos / Misspelling  │                   │ │
│  │  │ 3 queries scored    │  │ 1 query scored       │                   │ │
│  │  │                     │  │                      │                   │ │
│  │  │ Goodreads   50.0%   │  │ Hardcover   40.0%    │                   │ │
│  │  │ Hardcover   25.0%   │  │ Goodreads    0.0%    │                   │ │
│  │  │ StoryGraph  12.5%   │  │ StoryGraph   0.0%    │                   │ │
│  │  └─────────────────────┘  └─────────────────────┘                   │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  Scoring Info                                                        │ │
│  │  How scoring works: each golden book found in results = 1 pt.       │ │
│  │  Position bonus: +0.5 pts if found at same or higher rank.          │ │
│  │  Max per query = golden count × 1.5                                  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- On mount, fetches scoring data via `fetchScores()`. Single `loading` state.
- The page has three sections: **Leaderboard Table**, **Category Comparison**, and **Scoring Info**.

**Leaderboard Table:**

- Shows all apps ranked by total score.
- Columns: Rank, App (logo + name), Score (absolute), Percentage, Results Coverage (queries with results / queries scored), and an expand toggle.
- **Rank column**: Shows numeric rank. Tied apps share the same rank (e.g., two apps at rank 3 with the same score). Rank numbers use special styling for top 3: rank 1 = `text-amber-400` (gold), rank 2 = `text-zinc-300` (silver), rank 3 = `text-amber-700` (bronze).
- **Score column**: Shows `totalScore` / `maxScore` (e.g., "7.5 / 22.5"). The score text color uses `getScoreColor(percentage)`.
- **Percentage column**: Shows percentage with color from `getScoreColor`. A small horizontal progress bar fills behind the percentage text to provide visual weight. The progress bar uses `getScoreBgColor(percentage)`.
- **Results coverage**: Shows `queriesWithResults / queriesScored` — provides context about data completeness. If an app has entered results for all scored queries, it shows in emerald; otherwise zinc.
- **Expand toggle**: A `▶` / `▼` toggle button that expands the row to show the per-query score breakdown inline.
- **App name click**: Navigates to `/apps/{appId}` (the App Detail page).

**Expanded row — per-query breakdown:**

When a row is expanded, a sub-table appears below it showing the per-query scores for that app.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ▼ 1  [logo] Goodreads     7.5 / 22.5     33.3%     4 / 5              │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  #  │  Query               │  Hits │  Pos  │  Score │  Max       │  │
│  │  1  │  the hunger games     │  3/4  │  3/3  │  4.5   │  6.0      │  │
│  │  2  │  pride and prejudice  │  1/2  │  1/1  │  1.5   │  3.0      │  │
│  │  5  │  gone girl            │  1/2  │  1/1  │  1.5   │  3.0      │  │
│  │  7  │  harry poter          │  0/5  │  0/0  │  0.0   │  7.5      │  │
│  │ 19  │  it ends with us      │  0/2  │  0/0  │  0.0   │  3.0      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Columns**: Query index, Query text (clickable → navigates to `/queries/{index}`), Hits (matches/golden), Position bonuses (bonus count/hit count), Score, Max.
- **Row styling**: Score cells are color-coded using `getScoreColor` based on `score/maxScore` percentage.
- **"No result" rows** (where app has no result entry): Show "—" in hits/pos/score columns in `text-zinc-600`.

**Category Comparison section:**

A card grid showing per-category performance across all apps. One card per category (only categories that have at least one scored query are shown).

- **Card header**: Category name (using `CATEGORY_LABELS`) and query count.
- **Card body**: List of apps sorted by category percentage (highest first). Each row shows: app logo (16×16), app name, percentage with color from `getScoreColor`.
- **Card layout**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

**Scoring Info section:**

A small informational card at the bottom explaining how scoring works. Static text, not dynamic. Helps users understand what the numbers mean.

Contents:
- "Each golden book found in an app's results = **1 point**"
- "Position bonus: **+0.5 points** if found at the same rank or higher"
- "Maximum per query = golden count × 1.5"
- "Queries without golden results are excluded from scoring"

**State:**

All state is local:
- `data` — the full scoring response object (or null).
- `loading` — boolean (initial page load).
- `error` — string or null.
- `expandedApps` — `Set<string>` of app IDs with expanded rows.

**Empty states:**

- **No apps**: "No apps have been registered yet." with link to `/apps`.
- **No golden results**: "No golden results have been defined yet. Scoring requires golden results as the ground truth." with link to `/golden`.
- **Golden results exist but no results entered for any app**: Table shows all apps with 0 scores. No special empty state — the data speaks for itself.

---

### `Sidebar.jsx` — Updated Navigation

Add a Leaderboard entry to the sidebar navigation, between "Compare" and "Golden Results".

**Updated `navItems` array:**

```js
const navItems = [
  { label: 'Dashboard', path: '/', icon: '\u{1F4CA}' },
  { label: 'Apps', path: '/apps', icon: '\u{1F4F1}' },
  { label: 'Queries', path: '/queries', icon: '\u{1F50D}' },
  { label: 'Compare', path: '/compare', icon: '\u2696\uFE0F' },
  { label: 'Leaderboard', path: '/leaderboard', icon: '\u{1F3C6}' },
  { label: 'Golden Results', path: '/golden', icon: '\u2B50' },
];
```

The trophy emoji (🏆) is used for the Leaderboard icon — it visually conveys ranking/competition.

---

### `App.jsx` — Updated Routes

Add the `/leaderboard` route.

```jsx
import LeaderboardPage from './pages/LeaderboardPage'

// Inside Routes, after the /compare route:
<Route path="leaderboard" element={<LeaderboardPage />} />
```

---

## Styling

All styling uses **Tailwind CSS 4** classes consistent with the dark theme.

### Leaderboard Table (LeaderboardPage)

```
- Table container: bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6
- Table: w-full border-collapse text-sm
- Header row: bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider
- Header cell: px-4 py-3
- Body row: border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors
- Rank cell: px-4 py-4 text-lg font-bold w-16 text-center
- App cell: px-4 py-4 flex items-center gap-3
- App logo: w-8 h-8 rounded-lg object-cover
- App name: text-sm font-medium text-zinc-100 cursor-pointer hover:text-indigo-400
- Score cell: px-4 py-4 font-mono text-sm
- Score value: (color from getScoreColor)
- Score max: text-zinc-600 ml-1
- Percentage cell: px-4 py-4 relative
- Percentage text: text-sm font-semibold relative z-10 (color from getScoreColor)
- Percentage bar: absolute inset-y-1 left-1 rounded h-auto (width = percentage%, color from getScoreBgColor)
- Coverage cell: px-4 py-4 text-sm font-mono
- Coverage (complete): text-emerald-400
- Coverage (partial): text-zinc-400
- Expand toggle: px-4 py-4 text-zinc-400 hover:text-zinc-200 cursor-pointer text-sm
```

### Expanded Row / Per-Query Sub-table (LeaderboardPage)

```
- Expanded container: bg-zinc-950 border-t border-zinc-800 px-8 py-4
- Sub-table: w-full text-xs
- Sub-header: text-zinc-500 uppercase tracking-wider
- Sub-row: border-t border-zinc-800/50 hover:bg-zinc-900/50
- Query index: text-zinc-500 font-mono w-10
- Query text: text-zinc-300 font-mono cursor-pointer hover:text-indigo-400
- Hits cell: font-mono (color based on hits/goldenCount ratio via getScoreColor)
- Position cell: text-zinc-400 font-mono
- Score cell: font-mono (color from getScoreColor based on score/maxScore)
- Max cell: text-zinc-600 font-mono
- No result row: text-zinc-600 italic
```

### Category Comparison Cards (LeaderboardPage)

```
- Container: mb-6
- Section title: text-lg font-semibold text-zinc-100 mb-4
- Card grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Card: bg-zinc-900 border border-zinc-800 rounded-xl p-5
- Card header: text-sm font-semibold text-zinc-100 mb-1
- Card sub-header: text-xs text-zinc-500 mb-3
- App row: flex items-center gap-2 py-1.5
- App logo (small): w-4 h-4 rounded object-cover
- App name: text-xs text-zinc-400 flex-1
- App percentage: text-xs font-mono (color from getScoreColor)
```

### Scoring Info Card (LeaderboardPage)

```
- Card: bg-zinc-900 border border-zinc-800 rounded-xl p-6
- Title: text-sm font-semibold text-zinc-300 mb-3
- Body: text-xs text-zinc-500 space-y-1.5
- Emphasized text: text-zinc-300 font-medium
```

### Loading Skeleton (LeaderboardPage)

```
- Table skeleton: 5 rows (h-14 bg-zinc-800/50 rounded animate-pulse mb-1)
- Category card skeletons: 3 cards (h-32 bg-zinc-800/50 rounded-xl animate-pulse)
```

---

## Routing

Two routing changes:

1. **Add route** in `App.jsx`: `/leaderboard` → `LeaderboardPage`
2. **Add sidebar item** in `Sidebar.jsx`: "Leaderboard" entry with `/leaderboard` path.

No changes to existing routes.

---

## Loading and Error Handling

### Loading States

- **LeaderboardPage**: Render skeleton table and category card placeholders while `loading` is true. The page header remains visible during loading.

### Error States

- **LeaderboardPage**: If the scores fetch fails, show a centered error card with the error message and a "Retry" button. The page header remains visible.

### Empty States

- **No apps**: Show a message prompting the user to add apps, with a link to `/apps`.
- **No golden results**: Show a message explaining that golden results are needed for scoring, with a link to `/golden`.
- **No results**: Table shows all apps with 0 scores. The data is self-explanatory.

---

## UI/UX Considerations

- **Desktop-first**: The leaderboard table and category cards are designed for desktop (1200px+).
- **Computed, not cached**: Scores are computed fresh on every page load. This ensures data is always current. With ≤10 apps × 50 queries, the computation is fast (sub-second). No caching layer needed.
- **Rank ties**: Apps with the same total score share the same rank. This is standard competition ranking (1, 2, 2, 4 — not 1, 2, 2, 3).
- **Golden coverage as context**: The golden coverage count (e.g., "5 / 50 queries scored") is prominently shown to set expectations. If only 5 of 50 queries have golden results, the scores reflect a small sample. This encourages the user to define more golden results.
- **Expandable rows**: The per-query breakdown uses expandable rows rather than a separate page. This keeps the leaderboard as the single source of truth for scores and avoids context-switching.
- **Category comparison**: Category cards enable quick identification of each app's strengths and weaknesses by query type. This is the key insight — knowing "App A handles typos well but struggles with indie romance" is more actionable than a single aggregate score.
- **Scoring transparency**: The Scoring Info card explains the algorithm in plain language. Users don't need to guess what the numbers mean.
- **No filtering on Leaderboard**: Unlike the Comparison Views (which have search/filter), the Leaderboard is intentionally simple — it shows all apps, ranked. With ≤10 apps, filtering would add complexity without value. The expanded per-query breakdown provides the drill-down.
- **Cross-navigation**: Query text in the expanded breakdown is clickable → `/queries/{index}`. App names are clickable → `/apps/{appId}`. This enables easy navigation to detailed views.
- **Keyboard accessibility**: Expand/collapse toggle uses `<button>`. All links use `<Link>` or `<a>`. Table rows are semantically correct `<tr>` elements.
- **No auto-refresh**: Data is fetched once on mount. Browser refresh to see updated scores. A manual refresh button is not needed.

---

## Implementation Plan

- [x] **Step 1 — Create score color constants:** Create `src/constants/scoreColors.js` with `getScoreColor` and `getScoreBgColor` functions.
- [x] **Step 2 — Create backend scoring routes:** Create `server/routes/scores.js` with `GET /api/scores` and `GET /api/scores/:appId` endpoints. Register in `server/index.js`.
- [x] **Step 3 — Create mock scoring module:** Create `src/api/mock/scores.js` with `getScores()` and `getAppScore()` functions.
- [x] **Step 4 — Update mock handler:** Update `src/api/mock/index.js` to route scoring requests to mock module.
- [x] **Step 5 — Create frontend API module:** Create `src/api/scores.js` with `fetchScores()` and `fetchAppScore()`.
- [x] **Step 6 — Build LeaderboardPage:** Create `src/pages/LeaderboardPage.jsx` with the leaderboard table, expandable per-query breakdown, category comparison cards, and scoring info card.
- [x] **Step 7 — Update navigation:** Add Leaderboard entry to `src/components/Sidebar.jsx`. Add `/leaderboard` route to `src/App.jsx`.
- [x] **Step 8 — Smoke test:** Verify LeaderboardPage works with mock API. Test expand/collapse, navigation links, empty states. Lint and build pass.

---

## Future Considerations (Out of Scope)

- **Fuzzy matching in scoring**: Use Levenshtein distance or similar for title/author matching instead of exact (normalized) comparison. Would improve scoring accuracy for slight variations.
- **Category weighting**: Allow users to weight certain categories more heavily in the total score (e.g., baseline queries worth 2× because they represent the most common use case).
- **Score history**: Track scores over time to show trends as results are added or golden results are refined.
- **Export leaderboard**: Export the leaderboard table as CSV or PDF for sharing.
- **Score on AppDetailPage**: Show the app's score and rank on its detail page for at-a-glance performance.
- **Score badges in Compare views**: Replace the simple match count in Comparison Views with the position-weighted score from this spec.
- **Scoring config page**: Allow users to adjust scoring parameters (hit weight, position bonus) without code changes.
- **Relative rank change indicators**: Show ↑/↓ arrows for rank changes as data updates.

---

## Issues & Learnings

### Validation (2026-02-07)

**Resolved during review:**

1. **`src/utils/scoring.js` removed** — The scoring utility was not imported anywhere (backend and mock both inline their own `computeQueryScore` and `normalizeStr`). Removed to avoid dead code. The backend and mock each define the algorithm inline since they can't share imports across `server/` and `src/`.
2. **`GET /api/scores/:appId` simplified** — Rank computation removed from the single-app endpoint. Previously it fetched all apps and all results just to compute rank. Now rank is only computed by `GET /api/scores` (the leaderboard endpoint). The frontend should obtain the rank from the leaderboard data when needed.
3. **`getResults(appId)` call confirmed** — The mock `getResults(appId, queryIndex)` accepts two optional params. The spec calls `getResults(app._id)` to get all results for the app at once, then builds a Map. This is correct and intended.
4. **Query navigation uses `index`** — Confirmed: existing code navigates to `/queries/${q.index}`, and `QueryDetailPage` uses `fetchQueryByIndex(id)`. The spec's `/queries/{index}` links are correct.
5. **App navigation uses `_id`** — Confirmed: existing code navigates to `/apps/${app._id}`. The spec's `/apps/{appId}` links are correct.
6. **Position bonus = "same or better"** — Confirmed: `rRank <= gRank` means the bonus is awarded when the app ranks the book at the same position or higher (better) than the golden standard. This rewards apps that surface relevant books prominently.
7. **Category cards show all apps** — Including those with 0.0% in a category. All apps are listed in every category card.
8. **`totalQueries: 50` is hardcoded** — This is a fixed constant for the project, not dynamically computed.

### Implementation (2026-02-08)

**Findings during implementation:**

1. **Unused `goldenMap` in backend route** — The spec's conceptual `GET /api/scores` code defined `goldenMap` but never used it (iteration is directly over `goldenResults` array). Removed to pass lint.
2. **Destructured `rank` in mock `getAppScore`** — The spec destructures `rank` to exclude it from the single-app response. Renamed to `_rank` to satisfy the eslint `no-unused-vars` rule (project allows unused vars starting with `_` or uppercase).
3. **Query text in expanded rows** — The leaderboard `GET /api/scores` response does not include `queryText` in `queryScores` (only the single-app endpoint does). To display query text in expanded rows without extra API calls, the LeaderboardPage fetches all queries in parallel with scores and builds a `queryMap` lookup. This is a minor deviation from the spec (which only mentions `fetchScores()`), but avoids N+1 API calls when expanding rows.

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-07 | Spec 08 drafted — Scoring & Leaderboard |
| 2026-02-07 | Spec 08 validated — Removed `src/utils/scoring.js` (dead code), simplified `GET /api/scores/:appId` (no rank computation), confirmed all codebase assumptions |
| 2026-02-08 | Spec 08 implemented — All 8 steps completed. Lint and build pass. |
