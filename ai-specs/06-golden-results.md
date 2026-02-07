# Spec 06 — Golden Results

**Version:** 1.1
**Status:** Implemented

---

## Overview

This spec defines the **Golden Results** feature — the mechanism for defining the "perfect" expected result set for each of the 50 search queries. Golden results serve as ground truth: they represent what a perfect search engine would return for each query. Later specs (Scoring & Leaderboard) will compare each app's actual results against these golden sets to compute scores.

It covers:

1. Creating the **Mongoose model** for golden results (`GoldenResult`).
2. Implementing **backend API endpoints** (`GET /api/golden`, `GET /api/golden/:queryIndex`, `PUT /api/golden/:queryIndex`) — read and upsert operations.
3. Building the **frontend Golden Results Editor page** (`/golden`) — a table of all 50 queries with inline editing to define up to 9 "perfect" books per query.
4. **Updating the Query Detail page** (`/queries/:id`) to display the golden result set for the viewed query (replacing the placeholder).
5. Creating the **mock API layer** for golden results so frontend development works without a running backend.
6. Adding a **golden results API module** on the frontend (`src/api/golden.js`).

Golden results are fully user-managed — the user defines and edits the perfect result set for each query via the editor.

---

## Dependencies

- **Spec 02 (Project Setup & Scaffolding)** — must be implemented. Provides Express skeleton, Mongoose connection, API client, mock infrastructure, routing, and AppShell layout.
- **Spec 03 (Query Bank)** — must be implemented. Provides query data (the 50 queries) used to populate the golden results editor.

> **Note:** Spec 04 (App Management) and Spec 05 (Results Entry) are **not** dependencies for this spec. The golden results feature is independent of app results — it defines the ideal answers, not what any app returned.

---

## Data Model

### Mongoose Schema — `GoldenResult`

**File:** `server/models/GoldenResult.js`

```js
import mongoose from 'mongoose';

const goldenBookSchema = new mongoose.Schema({
  rank: { type: Number, required: true, min: 1, max: 9 },
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
}, { _id: false });

const goldenResultSchema = new mongoose.Schema({
  queryIndex: { type: Number, required: true, unique: true, min: 1, max: 50 },
  books: [goldenBookSchema],
}, {
  timestamps: true,
});

export default mongoose.model('GoldenResult', goldenResultSchema);
```

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `queryIndex` | Number | Yes | The query index (1–50) this golden result belongs to. Unique — one golden result per query |
| `books` | [GoldenBook] | No | Array of up to 9 book entries representing the perfect result set |
| `createdAt` | Date | Auto | Mongoose timestamp |
| `updatedAt` | Date | Auto | Mongoose timestamp |

**GoldenBook sub-document fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `rank` | Number | Yes | Position in the golden result set (1–9) |
| `title` | String | Yes | The correct book title |
| `author` | String | Yes | The correct author name |

**Design decisions:**

- **`queryIndex` instead of `queryId`**: Matches the convention established in Spec 05 (Results). Uses the query's numeric index (1–50) rather than MongoDB `_id`. Keeps URLs clean, simplifies mock data, and avoids cross-collection ObjectId dependencies.
- **Unique index on `queryIndex`**: Enforces one golden result per query at the database level. The API uses upsert semantics.
- **`books` array with `_id: false`**: Sub-documents don't need their own IDs — always accessed as part of the parent golden result.
- **No screenshots**: Golden results are purely about the book list — there's no "golden screenshot" concept.
- **Empty `books` is valid**: A golden result document with an empty books array means "golden result exists but hasn't been filled in yet." This is different from no document existing at all (no golden result defined). In practice, both states look the same in the UI — neither counts as "defined" for progress tracking.
- **No DELETE endpoint**: Golden results are created/updated, never deleted independently. To "clear" a golden result, the user saves it with an empty books array. This avoids the complexity of delete semantics and keeps the model simple.

---

## Backend API

### Routes — `server/routes/golden.js`

Read and upsert operations. No DELETE — golden results are cleared by saving with an empty books array.

#### `GET /api/golden`

Returns all golden results that have been defined (have at least one book), sorted by `queryIndex`.

**Response:** `200 OK`

```json
[
  {
    "_id": "664d1a...",
    "queryIndex": 1,
    "books": [
      { "rank": 1, "title": "The Hunger Games", "author": "Suzanne Collins" },
      { "rank": 2, "title": "Catching Fire", "author": "Suzanne Collins" },
      { "rank": 3, "title": "Mockingjay", "author": "Suzanne Collins" }
    ],
    "createdAt": "2026-02-07T14:00:00Z",
    "updatedAt": "2026-02-07T14:00:00Z"
  },
  {
    "_id": "664d1b...",
    "queryIndex": 2,
    "books": [
      { "rank": 1, "title": "Pride and Prejudice", "author": "Jane Austen" }
    ],
    "createdAt": "2026-02-07T14:05:00Z",
    "updatedAt": "2026-02-07T14:05:00Z"
  }
]
```

#### `GET /api/golden/:queryIndex`

Returns the golden result for a specific query by its `queryIndex` (1–50).

**Response:** `200 OK`

```json
{
  "_id": "664d1a...",
  "queryIndex": 1,
  "books": [
    { "rank": 1, "title": "The Hunger Games", "author": "Suzanne Collins" },
    { "rank": 2, "title": "Catching Fire", "author": "Suzanne Collins" },
    { "rank": 3, "title": "Mockingjay", "author": "Suzanne Collins" }
  ],
  "createdAt": "2026-02-07T14:00:00Z",
  "updatedAt": "2026-02-07T14:00:00Z"
}
```

**Error:** `404 Not Found` if no golden result exists for the given query index.

```json
{ "message": "Golden result not found" }
```

#### `PUT /api/golden/:queryIndex`

Creates or updates the golden result for a specific query. Uses **upsert** semantics: if a golden result already exists for the given `queryIndex`, it is updated; otherwise, a new one is created.

Accepts `application/json` (no file uploads).

**Request body:**

```json
{
  "books": [
    { "title": "The Hunger Games", "author": "Suzanne Collins" },
    { "title": "Catching Fire", "author": "Suzanne Collins" },
    { "title": "Mockingjay", "author": "Suzanne Collins" }
  ]
}
```

**Notes on the request format:**
- The `rank` field in `books` is optional in the request — if omitted, ranks are assigned automatically (1-indexed, based on array position). If provided, they are used as-is.
- An empty `books` array (`[]`) clears the golden result for that query.
- The `queryIndex` comes from the URL parameter, not the request body.

**Response:** `200 OK`

```json
{
  "_id": "664d1a...",
  "queryIndex": 1,
  "books": [
    { "rank": 1, "title": "The Hunger Games", "author": "Suzanne Collins" },
    { "rank": 2, "title": "Catching Fire", "author": "Suzanne Collins" },
    { "rank": 3, "title": "Mockingjay", "author": "Suzanne Collins" }
  ],
  "createdAt": "2026-02-07T14:00:00Z",
  "updatedAt": "2026-02-07T15:30:00Z"
}
```

**Validation errors:** `400 Bad Request`

```json
{ "message": "queryIndex must be between 1 and 50" }
{ "message": "books must be an array" }
{ "message": "Maximum 9 books allowed" }
{ "message": "Each book must have a title and author" }
```

### Route Registration

In `server/index.js`, import and mount the golden results router:

```js
import goldenRouter from './routes/golden.js';

// After existing routes:
app.use('/api/golden', goldenRouter);
```

### Route Implementation — Conceptual

```js
import { Router } from 'express';
import GoldenResult from '../models/GoldenResult.js';

const router = Router();

// GET /api/golden
router.get('/', async (req, res) => {
  try {
    const results = await GoldenResult.find({ 'books.0': { $exists: true } })
      .sort({ queryIndex: 1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/golden/:queryIndex
router.get('/:queryIndex', async (req, res) => {
  try {
    const qIndex = Number(req.params.queryIndex);
    if (isNaN(qIndex) || qIndex < 1 || qIndex > 50) {
      return res.status(400).json({ message: 'queryIndex must be between 1 and 50' });
    }
    const result = await GoldenResult.findOne({ queryIndex: qIndex });
    if (!result) {
      return res.status(404).json({ message: 'Golden result not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/golden/:queryIndex (upsert)
router.put('/:queryIndex', async (req, res) => {
  try {
    const qIndex = Number(req.params.queryIndex);
    if (isNaN(qIndex) || qIndex < 1 || qIndex > 50) {
      return res.status(400).json({ message: 'queryIndex must be between 1 and 50' });
    }

    const { books } = req.body;
    if (!Array.isArray(books)) {
      return res.status(400).json({ message: 'books must be an array' });
    }
    if (books.length > 9) {
      return res.status(400).json({ message: 'Maximum 9 books allowed' });
    }

    // Validate each book has title and author
    for (const book of books) {
      if (!book.title?.trim() || !book.author?.trim()) {
        return res.status(400).json({ message: 'Each book must have a title and author' });
      }
    }

    // Assign ranks if not provided
    const rankedBooks = books.map((b, i) => ({
      rank: b.rank || i + 1,
      title: b.title.trim(),
      author: b.author.trim(),
    }));

    const result = await GoldenResult.findOneAndUpdate(
      { queryIndex: qIndex },
      { queryIndex: qIndex, books: rankedBooks },
      { upsert: true, new: true, runValidators: true }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
```

---

## Frontend API Module

### `src/api/golden.js`

A thin module that calls the API client for golden result endpoints.

```js
import { api } from './client.js';

export async function fetchGoldenResults() {
  return api.get('/golden');
}

export async function fetchGoldenResult(queryIndex) {
  return api.get(`/golden/${queryIndex}`);
}

export async function saveGoldenResult(queryIndex, books) {
  return api.put(`/golden/${queryIndex}`, { books });
}
```

**Notes:**
- `saveGoldenResult` sends plain JSON (`{ books: [...] }`), not FormData — there are no file uploads.
- `fetchGoldenResults()` returns only golden results with at least one book (to compute progress). Empty golden results are not returned.
- `fetchGoldenResult(queryIndex)` fetches a single golden result. Returns a 404 error if none exists — the caller should catch this and treat it as "no golden result defined."

---

## Mock API Layer

### `src/api/mock/golden.js`

Contains mock golden result data and handler functions that mimic the backend behavior.

```js
let nextId = 6;

let MOCK_GOLDEN_RESULTS = [
  {
    _id: 'golden1',
    queryIndex: 1,
    books: [
      { rank: 1, title: 'The Hunger Games', author: 'Suzanne Collins' },
      { rank: 2, title: 'Catching Fire', author: 'Suzanne Collins' },
      { rank: 3, title: 'Mockingjay', author: 'Suzanne Collins' },
      { rank: 4, title: 'The Ballad of Songbirds and Snakes', author: 'Suzanne Collins' },
    ],
    createdAt: '2026-02-07T14:00:00Z',
    updatedAt: '2026-02-07T14:00:00Z',
  },
  {
    _id: 'golden2',
    queryIndex: 2,
    books: [
      { rank: 1, title: 'Pride and Prejudice', author: 'Jane Austen' },
      { rank: 2, title: 'Pride and Prejudice and Zombies', author: 'Seth Grahame-Smith' },
    ],
    createdAt: '2026-02-07T14:05:00Z',
    updatedAt: '2026-02-07T14:05:00Z',
  },
  {
    _id: 'golden3',
    queryIndex: 5,
    books: [
      { rank: 1, title: 'Gone Girl', author: 'Gillian Flynn' },
      { rank: 2, title: 'Gone Girl: A Novel', author: 'Gillian Flynn' },
    ],
    createdAt: '2026-02-07T14:10:00Z',
    updatedAt: '2026-02-07T14:10:00Z',
  },
  {
    _id: 'golden4',
    queryIndex: 7,
    books: [
      { rank: 1, title: "Harry Potter and the Sorcerer's Stone", author: 'J.K. Rowling' },
      { rank: 2, title: 'Harry Potter and the Chamber of Secrets', author: 'J.K. Rowling' },
      { rank: 3, title: 'Harry Potter and the Prisoner of Azkaban', author: 'J.K. Rowling' },
      { rank: 4, title: 'Harry Potter and the Goblet of Fire', author: 'J.K. Rowling' },
      { rank: 5, title: 'Harry Potter and the Order of the Phoenix', author: 'J.K. Rowling' },
    ],
    createdAt: '2026-02-07T14:15:00Z',
    updatedAt: '2026-02-07T14:15:00Z',
  },
  {
    _id: 'golden5',
    queryIndex: 19,
    books: [
      { rank: 1, title: 'It Ends with Us', author: 'Colleen Hoover' },
      { rank: 2, title: 'It Starts with Us', author: 'Colleen Hoover' },
    ],
    createdAt: '2026-02-07T14:20:00Z',
    updatedAt: '2026-02-07T14:20:00Z',
  },
];

export function getGoldenResults() {
  return MOCK_GOLDEN_RESULTS
    .filter((g) => g.books.length > 0)
    .sort((a, b) => a.queryIndex - b.queryIndex);
}

export function getGoldenResultByQueryIndex(queryIndex) {
  return MOCK_GOLDEN_RESULTS.find((g) => g.queryIndex === Number(queryIndex)) || null;
}

export function saveGoldenResult(queryIndex, body) {
  const qIndex = Number(queryIndex);
  if (isNaN(qIndex) || qIndex < 1 || qIndex > 50) {
    throw new Error('queryIndex must be between 1 and 50');
  }

  const { books } = body;
  if (!Array.isArray(books)) {
    throw new Error('books must be an array');
  }
  if (books.length > 9) {
    throw new Error('Maximum 9 books allowed');
  }

  for (const book of books) {
    if (!book.title?.trim() || !book.author?.trim()) {
      throw new Error('Each book must have a title and author');
    }
  }

  const rankedBooks = books.map((b, i) => ({
    rank: b.rank || i + 1,
    title: b.title.trim(),
    author: b.author.trim(),
  }));

  const now = new Date().toISOString();
  const existing = MOCK_GOLDEN_RESULTS.find((g) => g.queryIndex === qIndex);

  if (existing) {
    existing.books = rankedBooks;
    existing.updatedAt = now;
    return { ...existing };
  }

  const id = nextId++;
  const newResult = {
    _id: `golden${id}`,
    queryIndex: qIndex,
    books: rankedBooks,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_GOLDEN_RESULTS.push(newResult);
  return { ...newResult };
}
```

**Notes:**
- 5 mock golden results covering queries 1, 2, 5, 7, and 19 — a mix of baseline, typo, and romance queries to demonstrate different completion states.
- `getGoldenResults()` returns only golden results with at least one book (filters out empty ones).
- `saveGoldenResult()` validates input and uses upsert logic consistent with the backend.

### Update `src/api/mock/index.js`

**Append** golden result route matching above the fallback, after the existing result routes:

```js
import { getGoldenResults, getGoldenResultByQueryIndex, saveGoldenResult } from './golden.js';

// Inside handleRequest, after result routes:

// --- Golden result routes ---

// GET /golden
if (method === 'GET' && path === '/golden') {
  return getGoldenResults();
}

// GET /golden/:queryIndex
const goldenGetMatch = path.match(/^\/golden\/(\d+)$/);
if (method === 'GET' && goldenGetMatch) {
  const result = getGoldenResultByQueryIndex(goldenGetMatch[1]);
  if (!result) throw new Error('Golden result not found');
  return result;
}

// PUT /golden/:queryIndex
const goldenPutMatch = path.match(/^\/golden\/(\d+)$/);
if (method === 'PUT' && goldenPutMatch) {
  return saveGoldenResult(goldenPutMatch[1], body);
}
```

**Note on regex pattern:** Uses `\d+` for `queryIndex` (numeric only), unlike the `[a-zA-Z0-9]+` pattern used for app/result IDs. Golden results are always addressed by numeric query index, not MongoDB `_id`.

---

## Frontend Pages

### Directory & File Structure (New/Modified Files)

```
src/
├── api/
│   ├── golden.js                  # NEW — golden results API module
│   └── mock/
│       ├── index.js               # MODIFIED — add golden result route handlers
│       └── golden.js              # NEW — mock golden result data
├── pages/
│   ├── GoldenPage.jsx             # MODIFIED — full implementation
│   └── QueryDetailPage.jsx        # MODIFIED — display golden results
server/
├── models/
│   └── GoldenResult.js            # NEW — golden result Mongoose model
├── routes/
│   └── golden.js                  # NEW — golden result API routes
├── index.js                       # MODIFIED — register golden results router
```

### 1. `GoldenPage.jsx` — Golden Results Editor (`/golden`)

This is the main editor page where the user defines the perfect result set for each of the 50 queries.

**Layout — Two-column (query navigator + editing form):**

Uses the same two-column layout as ResultsEntryPage (Spec 05): a narrow scrollable query navigator on the left and the editing form on the right. This lets the user see both the query list and the editing form without scrolling up/down.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Golden Results                                                          │
│  Define the perfect expected result set for each query.                  │
│  Progress: 5 / 50 defined                                               │
│                                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐ │
│  │  Query Navigator      │  │  Editing: #7 — harry poter     [typo]  │ │
│  │                       │  │  Misspelled famous title — fuzzy        │ │
│  │  ● 1  the hunger ga…  │  │  matching baseline                     │ │
│  │  ● 2  pride and pre…  │  │                                        │ │
│  │    3  colleen hoover  │  │  Books (5 of 9)       [Manual] [JSON]  │ │
│  │    4  dune frank he…  │  │                                        │ │
│  │  ● 5  gone girl       │  │  1. Harry Potter and the Sorcerer's    │ │
│  │    6  sapiens          │  │     Stone — J.K. Rowling          [×]  │ │
│  │  ● 7  harry poter     │  │  2. Harry Potter and the Chamber of    │ │
│  │    8  the alchemist   │  │     Secrets — J.K. Rowling        [×]  │ │
│  │    9  where the cra…  │  │  3. Harry Potter and the Prisoner of   │ │
│  │    …                  │  │     Azkaban — J.K. Rowling        [×]  │ │
│  │                       │  │  4. Harry Potter and the Goblet of     │ │
│  │                       │  │     Fire — J.K. Rowling           [×]  │ │
│  │                       │  │  5. Harry Potter and the Order of the  │ │
│  │                       │  │     Phoenix — J.K. Rowling        [×]  │ │
│  │                       │  │                                        │ │
│  │                       │  │  ┌─────────┐ ┌────────────┐ [+ Add]   │ │
│  │                       │  │  │ Title   │ │ Author     │            │ │
│  │                       │  │  └─────────┘ └────────────┘            │ │
│  │                       │  │                                        │ │
│  │                       │  │            [Cancel]  [Save Golden Set]  │ │
│  └──────────────────────┘  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- On mount, fetches two data sets **in parallel** using `Promise.all()`:
  1. All 50 queries via `fetchQueries()`.
  2. All golden results via `fetchGoldenResults()`.
- A single `loading` state covers both fetches.
- **Deep-link support**: Reads the `?query=X` URL search parameter (via `useSearchParams()`) on mount. After data loads, if a valid `query` param is present (1–50), auto-selects that query in the navigator and populates the editing form. This enables the "Edit in Golden Editor" link from QueryDetailPage to land on the correct query.

**Query navigator (left column):**

- Same pattern as ResultsEntryPage navigator sidebar.
- Width: `w-72 shrink-0`, scrollable (`overflow-y-auto`).
- Lists all 50 queries. Each row shows: status indicator (filled circle `●` in emerald-400 if golden result defined, hollow/zinc-600 if not), query index, query text (font-mono, truncated).
- **Clicking a row** selects the query and populates the editing form on the right with the golden result data for that query (if any exist).
- The currently selected row is highlighted with `bg-zinc-800 border-l-2 border-indigo-400`.
- A **progress counter** in the page header shows "X / 50 defined" where X is the number of queries that have golden results with at least one book.

**Editing form (right column):**

- Takes remaining width (`flex-1 overflow-y-auto`).
- When no query is selected, shows a distinct card placeholder: "Click a query to edit its golden results" (see Empty States below).
- When a query is selected, shows the selected query's info: index, text, description, category badge.
- **Books section** — identical UX to the Results Entry page (Spec 05), with the same two input modes:
  - **Manual mode** (default): List of books with rank, title, author, and remove button. "Add Book" row with title/author inputs and an "Add" button (disabled when either input is empty). Maximum 9 books. Books are re-ranked automatically when added or removed.
  - **JSON mode**: Textarea for pasting a JSON array of `{ "title": "...", "author": "..." }` objects. "Apply JSON" button to parse, validate, and replace the current books list. Pre-populated with existing books when switching to JSON mode. On success, switches back to Manual mode.
  - **Same validation rules as Spec 05**: Invalid JSON, not an array, missing title/author, or more than 9 entries → inline error message. Every book must have non-empty title and author before saving.
- **Action buttons:**
  - "Save Golden Set" — saves the golden result via `saveGoldenResult(queryIndex, books)`. Updates the local golden results array and the table's book count / status. Shows a loading spinner during save. Disabled if no changes have been made since last save/load.
  - "Cancel" — discards any unsaved edits and resets the editing panel to the last saved state. If no golden result exists for this query, clears the form. Stays on the selected query.
- Save button is **disabled** when there are no changes (clean state).

**State:**

All state is local:
- `queries` — array of all 50 query objects.
- `goldenResults` — array of golden result objects (updated after each save).
- `loading` — boolean (initial page load).
- `saving` — boolean (save in progress).
- `error` — string or null.
- `saveError` — string or null (inline error message for save failures).
- `selectedQueryIndex` — number or null (1–50, the currently selected query).
- `books` — array of `{ rank, title, author }` objects for the current editing panel.
- `bookInputMode` — string: `'manual'` (default) or `'json'`.
- `jsonInput` — string (contents of the JSON textarea).
- `jsonError` — string or null (validation error message for JSON input).
- `newBookTitle` — string (input for adding a new book in manual mode).
- `newBookAuthor` — string (input for adding a new book in manual mode).
- `cleanStateRef` — `useRef` storing the last saved/loaded books array. Used to compute dirty state.

**Dirty state tracking:**

`isDirty` is **computed** (not stored as state) by comparing the current `books` array against `cleanStateRef.current`. This follows the same pattern as ResultsEntryPage — it's more reliable than manually setting a boolean on every change. The comparison checks JSON equality: `JSON.stringify(books) !== JSON.stringify(cleanStateRef.current)`.

When a query is selected or after a successful save, `cleanStateRef.current` is updated to the current books array.

**When switching queries** (clicking a different row in the navigator):

- If the user has **unsaved changes** (`isDirty` is true), show a browser `window.confirm("You have unsaved changes. Discard and switch queries?")`. If the user cancels, stay on the current query. If confirmed, discard changes and load the new query.
- Load the existing golden result for the newly selected query (if one exists in the `goldenResults` array), or show an empty form.
- Reset `bookInputMode` to `'manual'`, clear `jsonInput` and `jsonError`.
- Reset `newBookTitle` and `newBookAuthor` to empty.
- Update `cleanStateRef.current` to the loaded books (so `isDirty` computes as false).

### 2. `QueryDetailPage.jsx` — Updated Golden Results Section

The existing QueryDetailPage has an "App Results" section but no golden results section. This spec adds a golden results card.

**Changes:**

1. **Import and fetch golden result**: Add `fetchGoldenResult(id)` (from `src/api/golden.js`) to the existing `Promise.all()` call. The `id` is the query index from `useParams()`. Wrap in a `.catch(() => null)` so that **any** error (404, 500, network) silently resolves to `null`. This ensures a broken golden endpoint never blocks the QueryDetailPage from rendering its other content.

2. **Add `goldenResult` state**: Store the fetched golden result (or `null`).

3. **Add `renderGoldenResults()` helper**: Renders a card showing the golden result for this query.

**Golden Results card — when no golden result exists:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Golden Results                                                  │
│  No golden results defined yet.                                  │
│  Define golden results in the Golden Results editor.             │
│  [Go to Golden Editor →]                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Golden Results card — when golden result exists:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Golden Results                              3 books             │
│                                                                  │
│  1. The Hunger Games — Suzanne Collins                           │
│  2. Catching Fire — Suzanne Collins                              │
│  3. Mockingjay — Suzanne Collins                                 │
│                                                                  │
│  Last updated: Feb 7, 2026                                       │
│  [Edit in Golden Editor →]                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Placement:** The golden results card renders **between** the query info card and the app results section:
```
renderQueryCard()
renderGoldenResults()   ← NEW
renderAppResults()
```

**Link behavior:** The "Go to Golden Editor" / "Edit in Golden Editor" link navigates to `/golden?query={queryIndex}`, deep-linking to the specific query. The GoldenPage reads this URL parameter on mount and auto-selects the corresponding query (see GoldenPage behavior below).

---

## Styling

All styling uses **Tailwind CSS 4** classes consistent with the dark theme from Spec 02.

### Two-Column Layout (GoldenPage)

Same layout structure as ResultsEntryPage:

```
- Outer container: flex flex-col h-full
- Content area: flex flex-1 gap-6 overflow-hidden min-h-0
- Navigator (left): w-72 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl overflow-y-auto
- Form (right): flex-1 overflow-y-auto
```

### Query Navigator (GoldenPage)

Same pattern as ResultsEntryPage navigator:

```
- Navigator container: w-72 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl overflow-y-auto
- Navigator row: flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
                 border-l-2 border-transparent hover:bg-zinc-800/30
- Selected row: bg-zinc-800 border-l-2 border-indigo-400
- Status dot (defined): text-emerald-400 text-xs (● character)
- Status dot (not defined): text-zinc-600 text-xs (● character)
- Query index: text-zinc-500 text-xs font-mono w-5
- Query text: text-zinc-300 text-sm font-mono truncate
```

### Editing Form (GoldenPage)

```
- Form container: flex-1 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-xl p-6
- Form header (query info):
  - Index + text: text-lg font-semibold text-zinc-100 font-mono
  - Description: text-sm text-zinc-400 mt-1
  - Category badge: inline, mt-2
- No-selection card: bg-zinc-900 border border-zinc-800 rounded-xl p-6
                     flex items-center justify-center h-full
  - Text: text-zinc-500 text-sm
```

### Books Section (Editing Panel)

Reuses the same styling as ResultsEntryPage books section from Spec 05:

```
- Section header: flex items-center justify-between mb-3
  - Title + count: text-sm font-semibold text-zinc-300
  - Mode switcher: flex bg-zinc-800 rounded-lg p-0.5 gap-0.5
  - Mode tab (inactive): px-3 py-1 text-xs text-zinc-400 rounded-md cursor-pointer
                          hover:text-zinc-200 transition-colors
  - Mode tab (active): px-3 py-1 text-xs text-zinc-100 bg-zinc-700 rounded-md
- Book list: space-y-2
- Book item: flex items-center bg-zinc-800/50 rounded-lg px-4 py-2.5 gap-3
- Book rank: text-zinc-500 text-sm font-mono w-6
- Book title: text-zinc-100 text-sm font-medium flex-1
- Book author: text-zinc-400 text-sm
- Book dash separator: text-zinc-600 mx-2
- Book remove button: text-zinc-500 hover:text-rose-400 text-sm transition-colors
- Add book row: flex gap-3 mt-3
- Add book inputs: flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2
                   text-sm text-zinc-100 placeholder-zinc-500
                   focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
- Add book button: bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-2 rounded-lg
                   text-sm transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed
- JSON textarea: w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3
                 text-sm text-zinc-100 font-mono placeholder-zinc-500
                 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
                 resize-y min-h-[120px]
- JSON error: text-sm text-rose-400 mt-2
- Apply JSON button: bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-2 rounded-lg
                     text-sm transition-colors mt-3
```

### Action Buttons (Editing Panel)

```
- Button container: flex items-center justify-end gap-3 mt-6
- Cancel button: text-zinc-400 hover:text-zinc-100 px-4 py-2 rounded-lg text-sm
                 transition-colors
- Save button: bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg
               text-sm transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed
- Save error: text-sm text-rose-400 mt-2
```

### Golden Results Card (QueryDetailPage)

```
- Card: bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6
- Card title: text-lg font-semibold text-zinc-100 mb-4
- Book count badge: text-zinc-500 text-sm font-normal ml-2
- Book list: space-y-1
- Book item: flex items-baseline gap-2 text-sm
- Book rank: text-zinc-500 font-mono w-5 text-right shrink-0
- Book title: text-zinc-200
- Book dash: text-zinc-600
- Book author: text-zinc-400
- Placeholder text: text-zinc-500 italic
- Placeholder link text: text-zinc-600 text-sm mt-1
- Last updated: text-xs text-zinc-500 mt-4
- Editor link: text-indigo-400 hover:text-indigo-300 text-sm transition-colors mt-3
               inline-block
```

### Loading Skeleton (GoldenPage)

```
- Navigator: w-72 panel with 10 skeleton rows (h-8 bg-zinc-800/50 rounded animate-pulse mb-1)
- Form area: flex-1 panel with centered skeleton block
```

---

## Routing

No routing changes needed — the route already exists from Spec 02:

- `/golden` → `GoldenPage`
- `/golden?query=7` → `GoldenPage` with query #7 auto-selected (deep-link via URL search param, read with `useSearchParams()`)

---

## Loading and Error Handling

### Loading States

- **GoldenPage**: Render skeleton navigator rows (left) and a skeleton form placeholder (right) while `loading` is true (initial page load). During save operations, disable the Save button and show "Saving..." text.
- **QueryDetailPage**: No change to loading — the additional `fetchGoldenResult()` call is added to the existing `Promise.all()`.

### Error States

- **GoldenPage**: If initial fetch fails, show a centered error card with the error message and a "Retry" button.
- **Save errors**: Display inline error message below the action buttons (red text). The editing panel stays visible so the user can retry.
- **QueryDetailPage**: No change — existing error handling covers the page. The golden result fetch is wrapped in `.catch(() => null)` so **any** failure (404, 500, network) silently resolves to `null`. The golden results card then shows the "not defined" state. This ensures the rest of the page always renders.

### Empty States

- **GoldenPage, no query selected**: The editing form area shows a distinct placeholder card (centered text: "Click a query to edit its golden results") styled with `bg-zinc-900 border border-zinc-800 rounded-xl`, matching the form container. The navigator is always visible. This is the default landing state (unless a `?query=X` param is present).
- **GoldenPage, selected query with no golden result**: The editing panel shows with empty books. The user can start adding books immediately.

---

## UI/UX Considerations

- **Desktop-first**: The two-column layout (navigator + editing form) is designed for desktop (1200px+), matching the ResultsEntryPage layout. Both columns scroll independently.
- **Keyboard accessible**: Navigator rows are focusable. Add book inputs respond to Enter key (triggers add). All form inputs are standard HTML elements.
- **Unsaved changes guard**: When switching queries with unsaved changes, `window.confirm()` prompts the user. This prevents accidental data loss when the user is in the middle of defining a golden result set and clicks another query. Consistent with the AppDetailPage delete confirmation pattern.
- **No auto-save**: Saves require explicit button click, consistent with ResultsEntryPage. This gives users control over when data is persisted.
- **JSON paste for fast entry**: The JSON mode enables users to paste a complete set of golden books at once, same as the Results Entry flow. This is the expected primary workflow for users who prepare golden results externally.
- **Cancel button**: Unlike ResultsEntryPage (which silently discards on navigation), the GoldenPage has an explicit Cancel button because the editing panel is always visible and the user may want to discard edits without navigating away.
- **Clean state tracking**: The Save button is disabled when there are no changes (`isDirty` computes as false). `isDirty` is computed by comparing `books` against `cleanStateRef.current` via JSON stringify. This prevents unnecessary saves and gives clear feedback about the current state.
- **Progress tracking**: The "X / 50 defined" counter provides at-a-glance progress. The navigator's status dots show which queries still need golden results.
- **Deep-link support**: The `?query=X` URL parameter allows direct linking to a specific query from QueryDetailPage. This avoids the friction of landing on the golden editor and having to manually find the query.
- **Book list rendering**: Same rendering pattern as ResultsEntryPage and QueryDetailPage — rank, title, dash, author. Consistency across all spec surfaces.

---

## Implementation Plan

- [x] **Step 1 — Create GoldenResult model:** Create `server/models/GoldenResult.js` with the schema defined above.
- [x] **Step 2 — Create backend routes:** Create `server/routes/golden.js` with GET (list/single) and PUT (upsert) endpoints. Register in `server/index.js`.
- [x] **Step 3 — Create mock golden result data:** Create `src/api/mock/golden.js` with mock dataset and handler functions.
- [x] **Step 4 — Update mock handler:** Update `src/api/mock/index.js` to route golden result requests to mock module.
- [x] **Step 5 — Create frontend API module:** Create `src/api/golden.js` with `fetchGoldenResults()`, `fetchGoldenResult()`, `saveGoldenResult()`.
- [x] **Step 6 — Build GoldenPage:** Replace placeholder with full implementation — query table, editing panel, book entry (manual + JSON), save flow, progress counter.
- [x] **Step 7 — Update QueryDetailPage:** Add `fetchGoldenResult()` to data loading, render golden results card between query info and app results.
- [x] **Step 8 — Smoke test:** Verify both pages work with mock API, lint passes, build passes. Test save flow, book add/remove, JSON paste, query switching with dirty state, progress counter.

---

## Future Considerations (Out of Scope)

- **Import golden results from CSV/JSON file**: Bulk-import all 50 golden result sets at once from a file, instead of defining them one by one.
- **Golden result comparison view**: Show golden results side-by-side with app results for a visual diff.
- **Scoring preview**: Show a live score preview in the editing panel as the user defines golden results (requires Scoring from Spec 08).
- **Golden result history**: Track changes to golden results over time for audit purposes.
- **Drag-and-drop book reordering**: Drag books to reorder instead of sequential auto-ranking.
- **Inline editing in table**: Edit golden results directly in the table cells without a separate editing panel.

---

## Issues & Learnings

- No issues encountered. Implementation followed the spec closely.
- GoldenPage navigator uses `w-72` (spec) instead of `w-64` (ResultsEntryPage) since the spec explicitly requested `w-72` for the wider navigator.
- The `isDirty` computation uses `JSON.stringify` comparison as specified, which is simpler than the field-by-field comparison in ResultsEntryPage (since golden results have no screenshots to track separately).

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-07 | Spec 06 drafted — Golden Results |
| 2026-02-07 | Spec 06 v1.1 — Validation review: (1) Changed layout from vertical table+panel to two-column navigator+form matching ResultsEntryPage, (2) `isDirty` computed via `cleanStateRef` instead of explicit state, (3) Empty state uses distinct placeholder card, (4) QueryDetailPage silently swallows all golden fetch errors, (5) Added deep-link support (`?query=X`) — moved from future considerations to in-scope, (6) Updated styling/skeleton sections for two-column layout |
| 2026-02-07 | Spec 06 implemented — All 8 steps completed. Lint and build pass. |
