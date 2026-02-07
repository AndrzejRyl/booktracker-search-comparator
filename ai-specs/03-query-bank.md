# Spec 03 — Query Bank

**Version:** 1.1
**Status:** Draft

---

## Overview

This spec defines the **Query Bank** — the backbone data layer of the application. It covers:

1. Defining all **50 search queries** in a static seed file (`server/data/queries.json`).
2. Creating the **Mongoose model** for queries.
3. Building a **seed script** that populates MongoDB from the JSON file.
4. Implementing **backend API endpoints** (`GET /api/queries`, `GET /api/queries/:id`).
5. Building the **frontend Query Bank page** (`/queries`) — a filterable, searchable table of all 50 queries showing per-query metadata and result counts.
6. Building the **frontend Query Detail page** (`/queries/:id`) — displays the query, its category, and a placeholder area for golden results and per-app comparisons (populated by later specs).
7. Creating the **mock API layer** for queries so frontend development works without a running backend.
8. Adding a **query API module** on the frontend (`src/api/queries.js`).

The Query Bank is read-only from the user's perspective — queries are seeded, not created or edited via the UI. The API reflects this: only `GET` endpoints are provided.

---

## Dependencies

- **Spec 02 (Project Setup & Scaffolding)** — must be implemented. Provides Express skeleton, Mongoose connection, API client, mock infrastructure, routing, and AppShell layout.

---

## The 50 Search Queries

Each query has an `index` (1–50), the exact `text` to search, a human-readable `description` explaining the test intent, and a `category` tag for filtering.

> **Note:** This query list is the canonical, refined version. It supersedes the rough draft in Spec 01, which used different groupings and different queries. The `category` field defined here is an addition to the Spec 01 data model.

### Design Philosophy

The query set is deliberately **weighted toward indie, self-published, and KU-only titles**. All search engines handle bestsellers well — the real differentiator is how they surface lesser-known books. Bestseller queries are included as a baseline sanity check, not the focus.

Approximate split: **~12 bestseller/classic** queries (24%) vs **~28 indie/self-pub/KU** queries (56%) vs **~10 feature/edge-case** queries (20%).

### Categories

| Category | Code | Queries | Count |
|---|---|---|---|
| Bestseller Baseline | `baseline` | 1–6 | 6 |
| Typos / Misspellings | `typo` | 7–12 | 6 |
| Partial / Truncated | `partial` | 13–15 | 3 |
| Series Name | `series` | 16–18 | 3 |
| Romance — Trad-Published | `romance-trad` | 19–20 | 2 |
| Romance — Indie / KU | `romance-indie` | 21–26 | 6 |
| Romance — Recent Indie | `romance-recent` | 27–31 | 5 |
| Thriller — Indie / Kindle-First | `thriller-indie` | 32–35 | 4 |
| Thriller — Recent | `thriller-recent` | 36–37 | 2 |
| Indie Fantasy / Sci-Fi | `fantasy-indie` | 38–42 | 5 |
| Non-English Titles | `non-english` | 43–44 | 2 |
| Translated Titles | `translated` | 45–46 | 2 |
| Edge Cases | `edge-case` | 47–50 | 4 |

### Full Query List

| # | Text | Description | Category |
|---|---|---|---|
| 1 | `the hunger games` | Popular fiction — title-only baseline | `baseline` |
| 2 | `pride and prejudice` | Classic fiction — title-only baseline | `baseline` |
| 3 | `colleen hoover` | Bestselling author — author-only baseline | `baseline` |
| 4 | `dune frank herbert` | Title + author combo baseline | `baseline` |
| 5 | `gone girl` | Trad thriller baseline | `baseline` |
| 6 | `sapiens` | Non-fiction baseline | `baseline` |
| 7 | `harry poter` | Misspelled famous title — fuzzy matching baseline | `typo` |
| 8 | `collen hoover` | Misspelled famous author — fuzzy matching baseline | `typo` |
| 9 | `frenkenstein` | Misspelled classic — fuzzy matching baseline | `typo` |
| 10 | `fourth wign` | Misspelled recent bestseller (Fourth Wing) — fuzzy on newer titles | `typo` |
| 11 | `icebreacker hannah grace` | Misspelled indie romance — fuzzy matching on indie title | `typo` |
| 12 | `the housemade` | Misspelled Kindle-first thriller (The Housemaid) — fuzzy on self-pub | `typo` |
| 13 | `lord of the` | Partial famous title — truncated mid-phrase | `partial` |
| 14 | `game of` | Partial famous title — truncated mid-phrase | `partial` |
| 15 | `catcher in` | Partial famous title — truncated mid-phrase | `partial` |
| 16 | `wheel of time` | Famous fantasy series — multi-book disambiguation | `series` |
| 17 | `twisted ana huang` | Indie romance series + author — series disambiguation | `series` |
| 18 | `cradle will wight` | Self-published progression fantasy series — niche series handling | `series` |
| 19 | `it ends with us` | Contemporary romance — trad-published bestseller | `romance-trad` |
| 20 | `the love hypothesis` | Contemporary romance — trad-published bestseller | `romance-trad` |
| 21 | `icebreaker hannah grace` | Sports romance — indie / Kindle-first | `romance-indie` |
| 22 | `things we never got over` | Small-town romance — indie breakout | `romance-indie` |
| 23 | `behind the net` | Sports romance — indie title | `romance-indie` |
| 24 | `the wall of winnipeg` | Sports romance — indie title | `romance-indie` |
| 25 | `king of wrath ana huang` | Indie romance — BookTok-driven | `romance-indie` |
| 26 | `binding 13 chloe walsh` | Sports romance — indie / self-published | `romance-indie` |
| 27 | `bloom ej blaise` | Romance — KU-only (2024–2025) | `romance-recent` |
| 28 | `bourbon and lies victoria wilder` | Romance — KU-only (2024–2025) | `romance-recent` |
| 29 | `rare blend michelle mosley` | Romance — KU-only (2024–2025) | `romance-recent` |
| 30 | `mile high liz tomforde` | Indie sports romance — self-published | `romance-recent` |
| 31 | `haunting adeline hd carlton` | Dark romance — self-published, BookTok phenomenon | `romance-recent` |
| 32 | `the housemaid freida mcfadden` | Thriller — Kindle-first / self-published breakout | `thriller-indie` |
| 33 | `never lie` | Thriller — Kindle-first title | `thriller-indie` |
| 34 | `the inmate` | Thriller — Kindle-first title | `thriller-indie` |
| 35 | `just the nicest couple mary kubica` | Thriller — mid-tier trad, not a mega-bestseller | `thriller-indie` |
| 36 | `julie chan is dead` | Thriller — recent lesser-known (2025) | `thriller-recent` |
| 37 | `imaginary strangers minka kent` | Thriller — recent indie (2025) | `thriller-recent` |
| 38 | `dungeon crawler carl` | Self-published LitRPG — tests niche genre indexing | `fantasy-indie` |
| 39 | `legends and lattes travis baldree` | Cozy fantasy — indie-to-trad crossover | `fantasy-indie` |
| 40 | `zodiac academy jaymin eve` | Indie fantasy academy romance — self-published series | `fantasy-indie` |
| 41 | `he who fights with monsters` | Self-published progression fantasy — web serial origin | `fantasy-indie` |
| 42 | `the atlas six olivie blake` | Started self-published, later picked up by trad | `fantasy-indie` |
| 43 | `百年孤独` | Non-English title — Chinese (One Hundred Years of Solitude) | `non-english` |
| 44 | `les misérables` | Non-English title — French with accented characters | `non-english` |
| 45 | `one hundred years of solitude` | Translated title in English | `translated` |
| 46 | `the little prince` | Translated title in English | `translated` |
| 47 | `percy jackson` | Children / YA series | `edge-case` |
| 48 | `978-0-06-112008-4` | ISBN — exact identifier lookup | `edge-case` |
| 49 | `house of leaves danielewski` | Niche / obscure — cult classic, long-tail coverage | `edge-case` |
| 50 | `the road` | Ambiguous / generic title — disambiguation test | `edge-case` |

---

## Data Model

### Mongoose Schema — `Query`

**File:** `server/models/Query.js`

```js
import mongoose from 'mongoose';

const querySchema = new mongoose.Schema({
  index: { type: Number, required: true, unique: true, min: 1, max: 50 },
  text: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
}, {
  timestamps: true,
});

querySchema.index({ category: 1 });

export default mongoose.model('Query', querySchema);
```

**Notes:**
- `index` is the query number (1–50), unique. Not to be confused with a MongoDB index.
- `category` has a secondary index for filtered lookups.
- `timestamps: true` adds `createdAt` and `updatedAt` automatically.

---

## Seed Data File

**File:** `server/data/queries.json`

A JSON array of 50 objects, each with `index`, `text`, `description`, and `category`. The full contents match the table above. Example structure:

```json
[
  {
    "index": 1,
    "text": "the hunger games",
    "description": "Popular fiction — title-only baseline",
    "category": "baseline"
  },
  {
    "index": 2,
    "text": "pride and prejudice",
    "description": "Classic fiction — title-only baseline",
    "category": "baseline"
  }
]
```

> The full 50-entry file will be created during implementation with all entries from the table above.

---

## Seed Script

**File:** `server/scripts/seed-queries.js`

A standalone script that:
1. Loads `dotenv` config (using explicit path `./server/.env`).
2. Connects to MongoDB via the same `config/db.js` helper.
3. Reads `server/data/queries.json`.
4. Deletes all existing documents in the `queries` collection.
5. Inserts all 50 queries.
6. Logs the result and disconnects.

```js
// Conceptual structure
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { readFile } from 'fs/promises';
import { connectDB } from '../config/db.js';
import Query from '../models/Query.js';

dotenv.config({ path: './server/.env' });

async function seed() {
  await connectDB();

  const data = JSON.parse(
    await readFile(new URL('../data/queries.json', import.meta.url), 'utf-8')
  );

  await Query.deleteMany({});
  const result = await Query.insertMany(data);
  console.log(`Seeded ${result.length} queries`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

### NPM Script

Add to **root** `package.json`:

```json
"seed:queries": "node server/scripts/seed-queries.js"
```

Usage: `npm run seed:queries`

---

## Backend API

### Routes — `server/routes/queries.js`

Two read-only endpoints. No create/update/delete — queries are seeded, not user-managed.

#### `GET /api/queries`

Returns all 50 queries, sorted by `index`. Supports optional category filter.

**Query parameters:**
- `category` (optional) — filter by category code (e.g., `?category=typo`).

**Response:** `200 OK`

```json
[
  {
    "_id": "664a1b...",
    "index": 1,
    "text": "the hunger games",
    "description": "Popular fiction — title-only baseline",
    "category": "baseline",
    "createdAt": "2026-02-07T...",
    "updatedAt": "2026-02-07T..."
  }
]
```

#### `GET /api/queries/:index`

Returns a single query by its `index` (1–50). Using `index` instead of MongoDB `_id` gives clean URLs (`/queries/11` instead of `/queries/664a1b...`) and keeps mock and real mode consistent.

**Response:** `200 OK`

```json
{
  "_id": "664a1b...",
  "index": 11,
  "text": "harry poter",
  "description": "Misspelled popular fantasy series — tests fuzzy matching",
  "category": "typo",
  "createdAt": "2026-02-07T...",
  "updatedAt": "2026-02-07T..."
}
```

**Error:** `404 Not Found` if no query matches the given index.

```json
{ "message": "Query not found" }
```

### Route Registration

In `server/index.js`, import and mount the queries router:

```js
import queriesRouter from './routes/queries.js';

// After middleware, before listen:
app.use('/api/queries', queriesRouter);
```

### Route Implementation — Conceptual

```js
import { Router } from 'express';
import Query from '../models/Query.js';

const router = Router();

// GET /api/queries
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) {
      filter.category = req.query.category;
    }
    const queries = await Query.find(filter).sort({ index: 1 });
    res.json(queries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/queries/:index
router.get('/:index', async (req, res) => {
  try {
    const query = await Query.findOne({ index: Number(req.params.index) });
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }
    res.json(query);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
```

---

## Frontend API Module

### `src/api/queries.js`

A thin module that calls the API client for query-related endpoints.

```js
import { api } from './client.js';

export async function fetchQueries(category = null) {
  const params = category ? `?category=${encodeURIComponent(category)}` : '';
  return api.get(`/queries${params}`);
}

export async function fetchQueryByIndex(index) {
  return api.get(`/queries/${index}`);
}
```

---

## Mock API Layer

### `src/api/mock/queries.js`

Contains the full 50-query dataset as a static array and exports handler functions that mimic the backend API behavior.

```js
const MOCK_QUERIES = [
  {
    _id: 'q1',
    index: 1,
    text: 'the hunger games',
    description: 'Popular fiction — title-only baseline',
    category: 'baseline',
    createdAt: '2026-02-07T00:00:00Z',
    updatedAt: '2026-02-07T00:00:00Z',
  },
  // ... all 50 entries with _id values q1–q50
];

export function getQueries(category = null) {
  if (category) {
    return MOCK_QUERIES.filter((q) => q.category === category);
  }
  return [...MOCK_QUERIES];
}

export function getQueryByIndex(index) {
  return MOCK_QUERIES.find((q) => q.index === Number(index)) || null;
}
```

> The full 50-entry mock array mirrors the seed data exactly, with synthetic `_id` values (`q1`–`q50`) for frontend development. Lookups on the detail page use `index` (1–50), not `_id`.

### Update `src/api/mock/index.js`

**Append** query route matching to the existing mock handler (do **not** replace the whole function — future specs will add more routes):

```js
import { getQueries, getQueryByIndex } from './queries.js';

export async function handleRequest(method, path, _body) {
  // --- Query routes ---

  // GET /queries or GET /queries?category=...
  if (method === 'GET' && (path === '/queries' || path.startsWith('/queries?'))) {
    const url = new URL(path, 'http://localhost');
    const category = url.searchParams.get('category');
    return getQueries(category);
  }

  // GET /queries/:index (e.g., /queries/11)
  const queryMatch = path.match(/^\/queries\/(\d+)$/);
  if (method === 'GET' && queryMatch) {
    const query = getQueryByIndex(queryMatch[1]);
    if (!query) throw new Error('Query not found');
    return query;
  }

  // --- Fallback (preserve for future specs) ---
  console.warn(`[Mock API] No handler for ${method} ${path}`);
  return { message: 'Not implemented' };
}
```

**Note on mock handler path matching:** The `path` passed to `handleRequest` from `client.js` includes the query string (e.g., `/queries?category=typo`). The mock handler needs to parse this. A cleaner approach is to have `client.js` pass the path and query params separately, but to avoid modifying the existing `client.js` contract from Spec 02, we parse the URL in the mock handler instead.

**Note on additive pattern:** Future specs (04, 05, 06) will add their own route blocks above the fallback. Each spec appends its section between the existing routes and the fallback `console.warn`.

---

## Frontend Pages

### Directory & File Structure (New/Modified Files)

```
src/
├── api/
│   ├── queries.js             # NEW — query API module
│   └── mock/
│       ├── index.js           # MODIFIED — add query route handlers
│       └── queries.js         # NEW — mock query data
├── pages/
│   ├── QueriesPage.jsx        # MODIFIED — full implementation
│   └── QueryDetailPage.jsx    # MODIFIED — full implementation
├── components/
│   └── QueryCategoryBadge.jsx # NEW — category badge component
```

### 1. `QueriesPage.jsx` — Query Bank Browser (`/queries`)

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  Query Bank                                                  │
│  Browse and filter the bank of 50 search queries.            │
│                                                              │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │ 🔍 Search queries... │  │ Category: [All ▾]            │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
│                                                              │
│  ┌────┬──────────────────────┬─────────────┬──────────────┐ │
│  │ #  │ Query Text           │ Category    │ Description  │ │
│  ├────┼──────────────────────┼─────────────┼──────────────┤ │
│  │ 1  │ the hunger games     │ title       │ Popular fic… │ │
│  │ 2  │ pride and prejudice  │ title       │ Classic pop… │ │
│  │ 3  │ the great gatsby     │ title       │ Classic pop… │ │
│  │ …  │ …                    │ …           │ …            │ │
│  └────┴──────────────────────┴─────────────┴──────────────┘ │
│                                                              │
│  Showing 50 of 50 queries                                    │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**

- On mount, fetches all 50 queries via `fetchQueries()`.
- **Text search filter** (local, client-side): filters by `text` and `description` fields. Debounced to 300ms using an inline `setTimeout`/`clearTimeout` pattern (no external utility library needed).
- **Category dropdown filter**: client-side filtering — fetch all 50 once, filter locally. The dropdown shows **human-readable labels** (e.g., "Romance — Indie / KU") sourced from the `CATEGORY_LABELS` export in `QueryCategoryBadge.jsx`. The "All" option shows all queries.
- **Table rows are clickable**: clicking a row navigates to `/queries/:index` (e.g., `/queries/11`).
- **Category badges**: use the `QueryCategoryBadge` component with color-coded backgrounds per category.
- Shows "Showing X of 50 queries" count below the table.
- Shows a **loading skeleton** while fetching (3–5 rows of pulsing placeholder blocks).
- Shows an **error state** if the fetch fails (message + retry button).
- Shows an **empty state** if no queries match the current filters ("No queries match your filters").

**State:**

All state is local (no Context needed):
- `queries` — array of all 50 query objects (fetched once).
- `loading` — boolean.
- `error` — string or null.
- `searchText` — string for the text filter input.
- `selectedCategory` — string for the category dropdown (empty string = all).

### 2. `QueryDetailPage.jsx` — Single Query Detail (`/queries/:id`)

**Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Query Bank                                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  #11                                                     ││
│  │  harry poter                                             ││
│  │  Misspelled popular fantasy series — tests fuzzy matching││
│  │  [typo]                                                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Golden Results                                          ││
│  │  No golden results defined yet.                          ││
│  │  (Managed in the Golden Results editor)                  ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  App Results                                             ││
│  │  No results recorded yet.                                ││
│  │  (Results are entered per-app in the Apps section)       ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**

- Reads `id` (the query `index`) from route params via `useParams()`.
- Fetches query data via `fetchQueryByIndex(id)`.
- Displays query number (`index`), text, description, and category badge.
- **"Back to Query Bank"** link navigates to `/queries`.
- **Golden Results section**: placeholder card with message "No golden results defined yet." This section will be populated by Spec 06 (Golden Results).
- **App Results section**: placeholder card with message "No results recorded yet." This section will be populated by Spec 05 (Results Entry) and Spec 07 (Comparison Views).
- Shows **loading skeleton** while fetching.
- Shows **error state** if fetch fails or query not found (404 → "Query not found" with link back to Query Bank).

### 3. `QueryCategoryBadge.jsx` — Category Badge Component

A small reusable component that renders a colored pill badge for a query category. Also exports `CATEGORY_LABELS` for use in the category dropdown and anywhere a human-readable category name is needed.

```jsx
export const CATEGORY_LABELS = {
  'baseline': 'Bestseller Baseline',
  'typo': 'Typos / Misspellings',
  'partial': 'Partial / Truncated',
  'series': 'Series Name',
  'romance-trad': 'Romance — Trad-Published',
  'romance-indie': 'Romance — Indie / KU',
  'romance-recent': 'Romance — Recent Indie',
  'thriller-indie': 'Thriller — Indie / Kindle-First',
  'thriller-recent': 'Thriller — Recent',
  'fantasy-indie': 'Indie Fantasy / Sci-Fi',
  'non-english': 'Non-English Titles',
  'translated': 'Translated Titles',
  'edge-case': 'Edge Cases',
};

const CATEGORY_COLORS = {
  'baseline': 'bg-blue-900/50 text-blue-300',
  'typo': 'bg-amber-900/50 text-amber-300',
  'partial': 'bg-orange-900/50 text-orange-300',
  'series': 'bg-emerald-900/50 text-emerald-300',
  'romance-trad': 'bg-pink-900/50 text-pink-300',
  'romance-indie': 'bg-rose-900/50 text-rose-300',
  'romance-recent': 'bg-fuchsia-900/50 text-fuchsia-300',
  'thriller-indie': 'bg-red-900/50 text-red-300',
  'thriller-recent': 'bg-red-900/50 text-red-200',
  'fantasy-indie': 'bg-purple-900/50 text-purple-300',
  'non-english': 'bg-teal-900/50 text-teal-300',
  'translated': 'bg-sky-900/50 text-sky-300',
  'edge-case': 'bg-zinc-700/50 text-zinc-300',
};

export default function QueryCategoryBadge({ category }) {
  const colors = CATEGORY_COLORS[category] || 'bg-zinc-800 text-zinc-400';
  const label = CATEGORY_LABELS[category] || category;
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {label}
    </span>
  );
}
```

This component will be reused in QueriesPage (table), QueryDetailPage (header), and later specs (Comparison Views, Golden Results). The `CATEGORY_LABELS` export is used by the QueriesPage category dropdown to show human-readable labels.

---

## Styling

All styling uses **Tailwind CSS 4** classes consistent with the dark theme established in Spec 02.

### Table Styling

```
- Table container: bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden
- Header row: bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider
- Body rows: border-t border-zinc-800 hover:bg-zinc-800/30 cursor-pointer transition-colors
- Row text: text-sm text-zinc-100 (query text), text-zinc-400 (description)
- Query text column: font-mono (to visually distinguish the search string)
```

### Search Input

```
- Container: relative, with search icon inside
- Input: w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 pl-10
         text-zinc-100 placeholder-zinc-500
         focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
```

### Category Dropdown

```
- Select: bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2
          text-zinc-100
          focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
```

### Cards (Query Detail Page)

```
- Card: bg-zinc-900 border border-zinc-800 rounded-xl p-6
- Card title: text-lg font-semibold text-zinc-100 mb-4
- Placeholder text: text-zinc-500 italic
```

### Loading Skeleton

```
- Rows: h-10 bg-zinc-800/50 rounded animate-pulse mb-2
- Render 5 skeleton rows
```

---

## Routing

No routing changes needed — the routes already exist from Spec 02:

- `/queries` → `QueriesPage`
- `/queries/:id` → `QueryDetailPage` (`:id` is the query `index` 1–50, e.g., `/queries/11`)

---

## Loading and Error Handling

### Loading States

- **QueriesPage**: Render 5 skeleton table rows (pulsing `bg-zinc-800/50 animate-pulse` blocks) while `loading` is true.
- **QueryDetailPage**: Render a skeleton card (pulsing blocks for title, text, description) while loading.

### Error States

- **QueriesPage**: If fetch fails, show a centered error card with the error message and a "Retry" button that re-triggers the fetch.
- **QueryDetailPage**: If fetch fails, show error message. If 404 (query not found), show "Query not found" with a link back to `/queries`.

### Empty State

- **QueriesPage**: If filters result in 0 matches, show "No queries match your filters. Try adjusting your search or category filter." with a "Clear filters" button.

---

## UI/UX Considerations

- **Desktop-first**: Table layout is optimized for desktop (1200px+). On smaller screens, the description column is **hidden** (`hidden lg:table-cell`).
- **Keyboard accessible**: Table rows are focusable, Enter/Space triggers navigation. Search input and dropdown are standard form elements.
- **Fast filtering**: All filtering is client-side (50 items), so results appear instantly as the user types.
- **Font choice**: Query text in `font-mono` to visually separate it from descriptions and UI labels — it represents a literal search string.
- **URL state**: Search text and category filters are **not** persisted in the URL for this spec. The dataset is small enough that re-filtering is instant. (Can be added later if needed.)

---

## Implementation Plan

- [ ] **Step 1 — Create seed data file:** Create `server/data/queries.json` with all 50 query entries (index, text, description, category).
- [ ] **Step 2 — Create Mongoose model:** Create `server/models/Query.js` with the schema defined above.
- [ ] **Step 3 — Create seed script:** Create `server/scripts/seed-queries.js`. Add `seed:queries` npm script to root `package.json`.
- [ ] **Step 4 — Create backend routes:** Create `server/routes/queries.js` with `GET /` and `GET /:index`. Register in `server/index.js`.
- [ ] **Step 5 — Run seed script and test endpoints:** Seed the database, verify both endpoints return correct data using `curl` or browser.
- [ ] **Step 6 — Create mock query data:** Create `src/api/mock/queries.js` with the full 50-query mock dataset.
- [ ] **Step 7 — Update mock handler:** Update `src/api/mock/index.js` to route query-related requests to the mock module.
- [ ] **Step 8 — Create frontend API module:** Create `src/api/queries.js` with `fetchQueries()` and `fetchQuery()`.
- [ ] **Step 9 — Create QueryCategoryBadge component:** Create `src/components/QueryCategoryBadge.jsx`.
- [ ] **Step 10 — Build QueriesPage:** Replace placeholder with full implementation — table, search, category filter, loading/error/empty states.
- [ ] **Step 11 — Build QueryDetailPage:** Replace placeholder with full implementation — query info card, placeholder sections for golden/app results.
- [ ] **Step 12 — Smoke test:** Verify both pages work with mock API, lint passes, build passes. Test category filtering and text search.

---

## Future Considerations (Out of Scope)

- **Result counts per query** in the QueriesPage table (e.g., "3 of 5 apps have results") — requires Results API from Spec 05.
- **Inline golden result preview** in the QueriesPage table — requires Golden Results API from Spec 06.
- **Export query list** as CSV or JSON.
- **Custom queries** — allowing users to add their own queries beyond the 50.
- **Query editing** — modifying query text/description via the UI.

---

## Issues & Learnings

*(To be filled during implementation)*

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-07 | Spec 03 drafted — Query Bank |
| 2026-02-07 | v1.1 — Validation review. Clarified: query list is canonical (supersedes Spec 01); detail route uses `index` not `_id`; mock handler is additive (append, don't replace); category dropdown shows human-readable labels via `CATEGORY_LABELS` export; debounce uses inline setTimeout; description column hidden (not truncated) on small screens |
