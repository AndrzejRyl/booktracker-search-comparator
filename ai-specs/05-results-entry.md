# Spec 05 — Results Entry

**Version:** 1.0
**Status:** Implemented

---

## Overview

This spec defines the **Results Entry** feature — the mechanism for recording how each book-tracking app responds to each of the 50 search queries. It covers:

1. Creating the **Mongoose model** for results (`Result`).
2. Implementing **backend CRUD endpoints** (`GET`, `POST`, `PUT`, `DELETE` on `/api/results`) with screenshot upload via Multer.
3. Building the **frontend Results Entry page** (`/apps/:id/results`) — a sequential workflow for entering search results (screenshots + book list) for each query.
4. **Updating the App Detail page** (`/apps/:id`) to show live query progress (not started / complete) based on actual result data.
5. **Activating cascade delete** — when an app is deleted, all its results are also deleted (replacing the TODO in Spec 04).
6. Creating the **mock API layer** for results so frontend development works without a running backend.
7. Adding a **results API module** on the frontend (`src/api/results.js`).

Results are fully user-managed — users can create, edit, and delete results for any app/query combination via the UI.

---

## Dependencies

- **Spec 02 (Project Setup & Scaffolding)** — must be implemented. Provides Express skeleton, Mongoose connection, Multer config (`screenshotUpload`), API client, mock infrastructure, routing, and AppShell layout.
- **Spec 03 (Query Bank)** — must be implemented. Provides query data used in the results entry flow (fetching all 50 queries to iterate through).
- **Spec 04 (App Management)** — must be implemented. Provides app data, the App Detail page with the "Enter Results" button, and the cascade delete TODO to be activated.

---

## Data Model

### Mongoose Schema — `Result`

**File:** `server/models/Result.js`

```js
import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  rank: { type: Number, required: true, min: 1, max: 9 },
  title: { type: String, required: true, trim: true },
  author: { type: String, required: true, trim: true },
}, { _id: false });

const resultSchema = new mongoose.Schema({
  appId: { type: mongoose.Schema.Types.ObjectId, ref: 'App', required: true },
  queryIndex: { type: Number, required: true, min: 1, max: 50 },
  screenshots: [{ type: String }],
  books: [bookSchema],
}, {
  timestamps: true,
});

// Compound unique index — one result per app per query
resultSchema.index({ appId: 1, queryIndex: 1 }, { unique: true });

// Index for fetching all results for an app
resultSchema.index({ appId: 1 });

export default mongoose.model('Result', resultSchema);
```

**Fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `appId` | ObjectId | Yes | Reference to the app this result belongs to |
| `queryIndex` | Number | Yes | The query index (1–50) this result is for |
| `screenshots` | [String] | No | Array of paths to uploaded screenshot images (up to 5) |
| `books` | [Book] | No | Array of up to 9 book entries (rank, title, author) |
| `createdAt` | Date | Auto | Mongoose timestamp |
| `updatedAt` | Date | Auto | Mongoose timestamp |

**Book sub-document fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `rank` | Number | Yes | Position in search results (1–9) |
| `title` | String | Yes | Book title as shown in the app's results |
| `author` | String | Yes | Author name as shown in the app's results |

**Design decisions:**

- **`queryIndex` instead of `queryId`**: Uses the query's numeric index (1–50) rather than MongoDB `_id`. This keeps the data model consistent with how queries are referenced throughout the app (URLs use `/queries/11`, not `/queries/664a1b...`), simplifies mock data, and avoids a cross-collection ObjectId dependency.
- **Compound unique index on `(appId, queryIndex)`**: Enforces one result per app per query at the database level. The API uses upsert semantics for create/update.
- **`books` array with `_id: false`**: Sub-documents don't need their own IDs since they're always accessed as part of the parent result.
- **No `completed` boolean**: A result's existence implies work has been done. The progress check is simply "does a result document exist for this app + queryIndex?"
- **Empty `screenshots` and `books` are valid**: A user might save a result with only screenshots (planning to add books later) or only books (no screenshots needed). The document's existence is what matters.

---

## Backend API

### Routes — `server/routes/results.js`

Full CRUD for results. Screenshot upload uses the existing `screenshotUpload` middleware from `server/middleware/upload.js`.

#### `GET /api/results?appId=X`

Returns all results for a given app. The `appId` query parameter is **required**.

**Query parameters:**

| Param | Required | Description |
|---|---|---|
| `appId` | Yes | Filter results by app ID |
| `queryIndex` | No | Filter to a specific query (1–50) |

**Response:** `200 OK`

```json
[
  {
    "_id": "664c1a...",
    "appId": "664b2c...",
    "queryIndex": 1,
    "screenshots": [
      "/uploads/results/1707300123-goodreads-q1.png"
    ],
    "books": [
      { "rank": 1, "title": "The Hunger Games", "author": "Suzanne Collins" },
      { "rank": 2, "title": "Catching Fire", "author": "Suzanne Collins" },
      { "rank": 3, "title": "Mockingjay", "author": "Suzanne Collins" }
    ],
    "createdAt": "2026-02-07T10:00:00Z",
    "updatedAt": "2026-02-07T10:00:00Z"
  }
]
```

**Error:** `400 Bad Request` if `appId` is missing.

```json
{ "message": "appId query parameter is required" }
```

#### `GET /api/results/:id`

Returns a single result by MongoDB `_id`.

**Response:** `200 OK` — same shape as a single object from the list endpoint.

**Error:** `404 Not Found`

```json
{ "message": "Result not found" }
```

#### `POST /api/results`

Creates or updates a result for an app+query combination. Uses **upsert** semantics: if a result already exists for the given `appId` + `queryIndex`, it is updated; otherwise, a new result is created.

Accepts `multipart/form-data` because of screenshot uploads.

**Request body (multipart):**

| Field | Type | Required | Description |
|---|---|---|---|
| `appId` | text | Yes | The app this result belongs to |
| `queryIndex` | text | Yes | The query index (1–50) |
| `books` | text (JSON) | No | JSON string of the books array (up to 9 entries) |
| `screenshots` | file(s) | No | Screenshot image(s) (up to 5, max 5MB each) |
| `existingScreenshots` | text (JSON) | No | JSON array of screenshot paths to keep from a previous save |

**Response:** `201 Created` (new) or `200 OK` (updated)

```json
{
  "_id": "664c1b...",
  "appId": "664b2c...",
  "queryIndex": 7,
  "screenshots": [
    "/uploads/results/1707300200-harry-poter-1.png"
  ],
  "books": [
    { "rank": 1, "title": "Harry Potter and the Sorcerer's Stone", "author": "J.K. Rowling" },
    { "rank": 2, "title": "Harry Potter and the Chamber of Secrets", "author": "J.K. Rowling" }
  ],
  "createdAt": "2026-02-07T12:00:00Z",
  "updatedAt": "2026-02-07T12:00:00Z"
}
```

**Validation errors:** `400 Bad Request`

```json
{ "message": "appId is required" }
{ "message": "queryIndex is required" }
{ "message": "queryIndex must be between 1 and 50" }
{ "message": "books must be a valid JSON array" }
{ "message": "Maximum 9 books allowed" }
```

**Screenshot handling on update:**

When updating an existing result, the `existingScreenshots` field tells the server which previously-uploaded screenshots to keep. New `screenshots` files are uploaded and appended. The final `screenshots` array is `[...existingScreenshots, ...newlyUploadedPaths]`, capped at 5 total. This avoids the need for a separate "delete screenshot" endpoint.

#### `DELETE /api/results/:id`

Deletes a single result.

**Response:** `200 OK`

```json
{ "message": "Result deleted" }
```

**Error:** `404 Not Found` if the result doesn't exist.

**Note:** Uploaded screenshot files are **not** deleted from disk when a result is deleted. This is the same deliberate simplification as logo files in Spec 04.

### Route Registration

In `server/index.js`, import and mount the results router:

```js
import resultsRouter from './routes/results.js';

// After existing routes:
app.use('/api/results', resultsRouter);
```

### Route Implementation — Conceptual

```js
import { Router } from 'express';
import Result from '../models/Result.js';
import { screenshotUpload } from '../middleware/upload.js';

const router = Router();

// GET /api/results?appId=X&queryIndex=Y
router.get('/', async (req, res) => {
  try {
    const { appId, queryIndex } = req.query;
    if (!appId) {
      return res.status(400).json({ message: 'appId query parameter is required' });
    }

    const filter = { appId };
    if (queryIndex) {
      filter.queryIndex = Number(queryIndex);
    }

    const results = await Result.find(filter).sort({ queryIndex: 1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/results/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/results (upsert)
router.post('/', screenshotUpload, async (req, res) => {
  try {
    const { appId, queryIndex, books, existingScreenshots } = req.body;

    if (!appId) {
      return res.status(400).json({ message: 'appId is required' });
    }
    const qIndex = Number(queryIndex);
    if (!queryIndex || isNaN(qIndex) || qIndex < 1 || qIndex > 50) {
      return res.status(400).json({ message: 'queryIndex must be between 1 and 50' });
    }

    // Parse books JSON
    let parsedBooks = [];
    if (books) {
      try {
        parsedBooks = JSON.parse(books);
      } catch {
        return res.status(400).json({ message: 'books must be a valid JSON array' });
      }
      if (!Array.isArray(parsedBooks)) {
        return res.status(400).json({ message: 'books must be a valid JSON array' });
      }
      if (parsedBooks.length > 9) {
        return res.status(400).json({ message: 'Maximum 9 books allowed' });
      }
    }

    // Build screenshots array
    let keepScreenshots = [];
    if (existingScreenshots) {
      try {
        keepScreenshots = JSON.parse(existingScreenshots);
      } catch {
        keepScreenshots = [];
      }
    }
    const newScreenshots = (req.files || []).map(
      (f) => `/uploads/results/${f.filename}`
    );
    const allScreenshots = [...keepScreenshots, ...newScreenshots].slice(0, 5);

    // Upsert: find by appId + queryIndex, create if not found
    const existing = await Result.findOne({ appId, queryIndex: qIndex });

    if (existing) {
      existing.books = parsedBooks;
      existing.screenshots = allScreenshots;
      await existing.save();
      return res.json(existing);
    }

    const result = await Result.create({
      appId,
      queryIndex: qIndex,
      books: parsedBooks,
      screenshots: allScreenshots,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/results/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Result not found' });
    }
    res.json({ message: 'Result deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
```

### Cascade Delete — Update `server/routes/apps.js`

Replace the TODO comment in the DELETE handler with actual cascade logic:

```js
import Result from '../models/Result.js';

// In the DELETE /api/apps/:id handler, after finding and deleting the app:
await Result.deleteMany({ appId: req.params.id });
```

---

## Frontend API Module

### `src/api/results.js`

A thin module that calls the API client for result-related endpoints.

```js
import { api } from './client.js';

export async function fetchResults(appId, queryIndex = null) {
  let params = `?appId=${encodeURIComponent(appId)}`;
  if (queryIndex) {
    params += `&queryIndex=${encodeURIComponent(queryIndex)}`;
  }
  return api.get(`/results${params}`);
}

export async function fetchResult(id) {
  return api.get(`/results/${id}`);
}

export async function saveResult(formData) {
  return api.post('/results', formData, true);
}

export async function deleteResult(id) {
  return api.del(`/results/${id}`);
}
```

**Notes:**
- `saveResult` always uses `FormData` (passed with `isFormData = true`) because screenshots may be included.
- There is no separate `updateResult` — the `POST` endpoint uses upsert semantics, so `saveResult` handles both creation and updates.
- `fetchResults(appId)` is the primary fetch — returns all results for an app to determine progress. Adding `queryIndex` narrows to a single result.

---

## Mock API Layer

### `src/api/mock/results.js`

Contains mock result data and handler functions that mimic the backend CRUD behavior.

```js
let nextId = 8;

let MOCK_RESULTS = [
  {
    _id: 'res1',
    appId: 'app1',
    queryIndex: 1,
    screenshots: ['/uploads/results/mock-goodreads-q1.png'],
    books: [
      { rank: 1, title: 'The Hunger Games', author: 'Suzanne Collins' },
      { rank: 2, title: 'Catching Fire', author: 'Suzanne Collins' },
      { rank: 3, title: 'Mockingjay', author: 'Suzanne Collins' },
    ],
    createdAt: '2026-02-07T10:00:00Z',
    updatedAt: '2026-02-07T10:00:00Z',
  },
  {
    _id: 'res2',
    appId: 'app1',
    queryIndex: 2,
    screenshots: ['/uploads/results/mock-goodreads-q2.png'],
    books: [
      { rank: 1, title: 'Pride and Prejudice', author: 'Jane Austen' },
      { rank: 2, title: 'Pride and Prejudice and Zombies', author: 'Seth Grahame-Smith' },
    ],
    createdAt: '2026-02-07T10:05:00Z',
    updatedAt: '2026-02-07T10:05:00Z',
  },
  {
    _id: 'res3',
    appId: 'app1',
    queryIndex: 5,
    screenshots: ['/uploads/results/mock-goodreads-q5.png'],
    books: [
      { rank: 1, title: 'Gone Girl', author: 'Gillian Flynn' },
      { rank: 2, title: 'Dark Places', author: 'Gillian Flynn' },
      { rank: 3, title: 'Sharp Objects', author: 'Gillian Flynn' },
    ],
    createdAt: '2026-02-07T10:10:00Z',
    updatedAt: '2026-02-07T10:10:00Z',
  },
  {
    _id: 'res4',
    appId: 'app2',
    queryIndex: 1,
    screenshots: [
      '/uploads/results/mock-hardcover-q1-1.png',
      '/uploads/results/mock-hardcover-q1-2.png',
    ],
    books: [
      { rank: 1, title: 'The Hunger Games', author: 'Suzanne Collins' },
      { rank: 2, title: 'Catching Fire', author: 'Suzanne Collins' },
    ],
    createdAt: '2026-02-07T11:00:00Z',
    updatedAt: '2026-02-07T11:00:00Z',
  },
  {
    _id: 'res5',
    appId: 'app2',
    queryIndex: 7,
    screenshots: [],
    books: [
      { rank: 1, title: "Harry Potter and the Sorcerer's Stone", author: 'J.K. Rowling' },
      { rank: 2, title: 'Harry Potter and the Chamber of Secrets', author: 'J.K. Rowling' },
      { rank: 3, title: 'Harry Potter and the Prisoner of Azkaban', author: 'J.K. Rowling' },
    ],
    createdAt: '2026-02-07T11:05:00Z',
    updatedAt: '2026-02-07T11:05:00Z',
  },
  {
    _id: 'res6',
    appId: 'app3',
    queryIndex: 1,
    screenshots: ['/uploads/results/mock-storygraph-q1.png'],
    books: [
      { rank: 1, title: 'The Hunger Games', author: 'Suzanne Collins' },
    ],
    createdAt: '2026-02-07T12:00:00Z',
    updatedAt: '2026-02-07T12:00:00Z',
  },
  {
    _id: 'res7',
    appId: 'app1',
    queryIndex: 21,
    screenshots: ['/uploads/results/mock-goodreads-q21.png'],
    books: [
      { rank: 1, title: 'It Ends with Us', author: 'Colleen Hoover' },
      { rank: 2, title: 'It Starts with Us', author: 'Colleen Hoover' },
      { rank: 3, title: 'Ugly Love', author: 'Colleen Hoover' },
      { rank: 4, title: 'November 9', author: 'Colleen Hoover' },
    ],
    createdAt: '2026-02-07T10:15:00Z',
    updatedAt: '2026-02-07T10:15:00Z',
  },
];

export function getResults(appId, queryIndex = null) {
  let filtered = MOCK_RESULTS.filter((r) => r.appId === appId);
  if (queryIndex) {
    filtered = filtered.filter((r) => r.queryIndex === Number(queryIndex));
  }
  return filtered.sort((a, b) => a.queryIndex - b.queryIndex);
}

export function getResultById(id) {
  return MOCK_RESULTS.find((r) => r._id === id) || null;
}

export function saveResult(body) {
  const appId = body.get ? body.get('appId') : body.appId;
  const queryIndex = Number(body.get ? body.get('queryIndex') : body.queryIndex);

  if (!appId) throw new Error('appId is required');
  if (!queryIndex || queryIndex < 1 || queryIndex > 50) {
    throw new Error('queryIndex must be between 1 and 50');
  }

  let parsedBooks = [];
  const booksStr = body.get ? body.get('books') : body.books;
  if (booksStr) {
    try {
      parsedBooks = JSON.parse(booksStr);
    } catch {
      throw new Error('books must be a valid JSON array');
    }
    if (parsedBooks.length > 9) {
      throw new Error('Maximum 9 books allowed');
    }
  }

  // Parse existing screenshots to keep
  let keepScreenshots = [];
  const existingStr = body.get ? body.get('existingScreenshots') : body.existingScreenshots;
  if (existingStr) {
    try {
      keepScreenshots = JSON.parse(existingStr);
    } catch {
      keepScreenshots = [];
    }
  }

  // In mock mode, no actual file upload — generate fake screenshot paths
  const newScreenshotCount = body.get ? (body.getAll?.('screenshots') || []).length : 0;
  const newScreenshots = Array.from({ length: newScreenshotCount }, (_, i) =>
    `/uploads/results/mock-${appId}-q${queryIndex}-${Date.now()}-${i}.png`
  );
  const allScreenshots = [...keepScreenshots, ...newScreenshots].slice(0, 5);

  const now = new Date().toISOString();
  const existing = MOCK_RESULTS.find(
    (r) => r.appId === appId && r.queryIndex === queryIndex
  );

  if (existing) {
    existing.books = parsedBooks;
    existing.screenshots = allScreenshots;
    existing.updatedAt = now;
    return { ...existing };
  }

  const id = nextId++;
  const newResult = {
    _id: `res${id}`,
    appId,
    queryIndex,
    screenshots: allScreenshots,
    books: parsedBooks,
    createdAt: now,
    updatedAt: now,
  };
  MOCK_RESULTS.push(newResult);
  return { ...newResult };
}

export function deleteResultById(id) {
  const index = MOCK_RESULTS.findIndex((r) => r._id === id);
  if (index === -1) throw new Error('Result not found');
  MOCK_RESULTS.splice(index, 1);
  return { message: 'Result deleted' };
}

export function deleteResultsByAppId(appId) {
  MOCK_RESULTS = MOCK_RESULTS.filter((r) => r.appId !== appId);
}
```

**Notes:**
- 7 mock results across 3 apps (app1 has 4, app2 has 2, app3 has 1) to demonstrate different progress levels.
- `saveResult` handles both `FormData` (from frontend) and plain object (for testing) via `body.get` check.
- `deleteResultsByAppId` is exported for use in the mock apps handler (cascade delete).
- In mock mode, new screenshot uploads generate fake paths using `Date.now()` for uniqueness — no actual files are created.

### Update `src/api/mock/index.js`

**Append** result route matching above the fallback, after the existing app routes. Uses `new URL()` for query-param parsing, consistent with the existing queries route handler:

```js
import { getResults, getResultById, saveResult, deleteResultById, deleteResultsByAppId } from './results.js';

// Inside handleRequest, after app routes:

// --- Result routes ---

// GET /results?appId=X or GET /results?appId=X&queryIndex=Y
if (method === 'GET' && (path === '/results' || path.startsWith('/results?'))) {
  const url = new URL(path, 'http://localhost');
  const appId = url.searchParams.get('appId');
  if (!appId) throw new Error('appId query parameter is required');
  const queryIndex = url.searchParams.get('queryIndex');
  return getResults(appId, queryIndex);
}

// GET /results/:id
const resultGetMatch = path.match(/^\/results\/([a-zA-Z0-9]+)$/);
if (method === 'GET' && resultGetMatch) {
  const result = getResultById(resultGetMatch[1]);
  if (!result) throw new Error('Result not found');
  return result;
}

// POST /results
if (method === 'POST' && path === '/results') {
  return saveResult(body);
}

// DELETE /results/:id
const resultDeleteMatch = path.match(/^\/results\/([a-zA-Z0-9]+)$/);
if (method === 'DELETE' && resultDeleteMatch) {
  return deleteResultById(resultDeleteMatch[1]);
}
```

**Also update the app DELETE handler** in `mock/index.js` to cascade-delete results:

```js
// DELETE /api/apps/:id — update to include cascade delete
if (method === 'DELETE' && appDeleteMatch) {
  const result = deleteAppById(appDeleteMatch[1]);
  deleteResultsByAppId(appDeleteMatch[1]);
  return result;
}
```

---

## Frontend Pages

### Directory & File Structure (New/Modified Files)

```
src/
├── api/
│   ├── results.js                 # NEW — result API module
│   └── mock/
│       ├── index.js               # MODIFIED — add result route handlers + cascade delete
│       └── results.js             # NEW — mock result data
├── pages/
│   ├── ResultsEntryPage.jsx       # MODIFIED — full implementation
│   └── AppDetailPage.jsx          # MODIFIED — live query progress from results data
├── constants/
│   └── resultStatus.js            # NEW — status labels and colors
server/
├── models/
│   └── Result.js                  # NEW — result Mongoose model
├── routes/
│   ├── results.js                 # NEW — result API routes
│   └── apps.js                    # MODIFIED — cascade delete activated
├── index.js                       # MODIFIED — register results router
```

### 1. `ResultsEntryPage.jsx` — Results Entry Flow (`/apps/:id/results`)

This is the core data-entry page. The user navigates here from the App Detail page to record search results for each query.

**Layout — Main view (query navigator + entry form):**

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Back to {App Name}                                                │
│                                                                       │
│  Results Entry — Goodreads                                           │
│  Record search results for each of the 50 queries.                    │
│  Progress: 4 / 50 complete                                           │
│                                                                       │
│  ┌──────────────────┐  ┌────────────────────────────────────────────┐│
│  │  Query Navigator  │  │  Query #7 — harry poter                   ││
│  │                   │  │  Misspelled popular fantasy series         ││
│  │  ┌──────────────┐│  │  [typo]                                    ││
│  │  │ Filter: [All]││  │                                            ││
│  │  └──────────────┘│  │  ┌──────────────────────────────────────┐  ││
│  │                   │  │  │  Screenshots                         │  ││
│  │  1 ● hunger games │  │  │                                      │  ││
│  │  2 ● pride and... │  │  │  [📷] [📷]  [+ Upload]              │  ││
│  │  3   colleen ho...│  │  │                                      │  ││
│  │  4   dune frank...│  │  └──────────────────────────────────────┘  ││
│  │  5 ● gone girl    │  │                                            ││
│  │  6   sapiens      │  │  ┌──────────────────────────────────────┐  ││
│  │  7 ● harry poter  │  │  │  Books (3 of 9)    [Manual] [JSON]   │  ││
│  │  8   collen ho... │  │  │                                      │  ││
│  │  …                │  │  │  --- Manual mode ---                 │  ││
│  │                   │  │  │  1. Harry Potter and the Sorcerer's  │  ││
│  │                   │  │  │     Stone — J.K. Rowling        [×]  │  ││
│  │                   │  │  │  2. Harry Potter and the Chamber     │  ││
│  │                   │  │  │     of Secrets — J.K. Rowling   [×]  │  ││
│  │                   │  │  │  3. Harry Potter and the Prisoner    │  ││
│  │                   │  │  │     of Azkaban — J.K. Rowling   [×]  │  ││
│  │                   │  │  │                                      │  ││
│  │                   │  │  │  ┌───────────┐ ┌──────────────────┐  │  ││
│  │                   │  │  │  │ Title     │ │ Author           │  │  ││
│  │                   │  │  │  └───────────┘ └──────────────────┘  │  ││
│  │                   │  │  │                       [+ Add Book]   │  ││
│  │                   │  │  │                                      │  ││
│  │                   │  │  │  --- JSON mode ---                   │  ││
│  │                   │  │  │  ┌──────────────────────────────────┐│  ││
│  │                   │  │  │  │[{"title":"...","author":"..."}]  ││  ││
│  │                   │  │  │  │                                  ││  ││
│  │                   │  │  │  └──────────────────────────────────┘│  ││
│  │                   │  │  │  (error message if invalid)          │  ││
│  │                   │  │  │                      [Apply JSON]    │  ││
│  │                   │  │  └──────────────────────────────────────┘  ││
│  │                   │  │                                            ││
│  │                   │  │     [Save]  [Save & Next →]  [Delete Result]││
│  │  50  the road     │  │                                            ││
│  └──────────────────┘  └────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- Reads `id` (app MongoDB `_id`) from route params via `useParams()`.
- On mount, fetches three data sets **in parallel** using `Promise.all()`:
  1. App data via `fetchApp(id)` — for the app name in the header.
  2. All queries via `fetchQueries()` — for the query navigator list.
  3. All existing results for this app via `fetchResults(id)` — to populate the form with saved data and show completion status.
- A single `loading` state covers all three fetches.

**Two-panel layout:**

- **Left panel — Query Navigator** (sidebar within the page, ~250px wide):
  - Scrollable list of all 50 queries showing query index and text (truncated).
  - Each query shows a **completion indicator**: a filled circle (●) if a result exists for that query, empty otherwise.
  - Clicking a query selects it and loads its data into the right panel.
  - **Status filter dropdown** at the top: "All" (default), "Completed", "Not started". Filters the visible queries in the list.
  - The currently selected query is highlighted with `bg-zinc-800 border-l-2 border-indigo-400`.

- **Right panel — Entry Form:**
  - Shows the selected query's info: index, text, description, category badge.
  - **Screenshots section:**
    - Displays existing screenshots as thumbnail previews (small grid of images).
    - Each thumbnail has an `×` button to remove it.
    - "Upload" button to add new screenshots (file input accepting images, up to 5 total).
    - Shows count: "X of 5 screenshots".
  - **Books section:**
    - Two input modes toggled via a **tab-style switcher** in the section header: **"Manual"** (default) and **"JSON"**.
    - Shows count in header: "X of 9 books".
    - **Manual mode:**
      - Lists existing book entries with rank, title, author, and a `×` remove button.
      - "Add Book" row at the bottom: two text inputs (title, author) and an "Add" button.
      - The "Add" button is **disabled** when either title or author input is empty.
      - When added, the book gets the next available rank (1-indexed, sequential). Both inputs clear after a successful add.
      - Duplicate books (same title+author) are allowed — different apps may return the same book at different ranks.
      - Books can be removed; remaining books are re-ranked automatically.
      - Maximum 9 books enforced in the UI (Add button disabled when 9 reached).
      - **Frontend validation on save:** Before saving, the frontend validates that every book in the list has a non-empty title and author. If any book is invalid, show an inline error and prevent save. (The Mongoose schema also enforces `required: true` on these fields as a backend safeguard.)
    - **JSON mode:**
      - A `<textarea>` where the user can paste a JSON array of book objects.
      - Accepts an array of `{ "title": "...", "author": "..." }` objects. The `rank` field is optional — if omitted, ranks are assigned automatically (1-indexed, based on array position).
      - An **"Apply JSON"** button parses the input, validates it, and replaces the current books list entirely.
      - **Validation:** On clicking "Apply JSON", the input is parsed. If invalid JSON, not an array, contains objects missing `title` or `author`, or has more than 9 entries, an inline error message is shown below the textarea (red text). The existing books list is not changed on validation failure.
      - On success, the books list updates, ranks are assigned sequentially, and the mode switches back to Manual to show the applied results.
      - **Pre-populated:** When switching to JSON mode, if books already exist, the textarea is pre-filled with the current books as a formatted JSON array (for easy editing). If no books exist, the textarea shows a placeholder with an example format.
      - The textarea placeholder text: `[{"title": "Book Title", "author": "Author Name"}, ...]`
  - **Action buttons:**
    - "Save" — saves the current result and stays on the same query.
    - "Save & Next" — saves and advances to the next query **in the currently filtered list**. If on the last visible query after filtering, stays on the current query. After saving, the current query may no longer match the active filter (e.g., "Not started" filter and the query just became "Complete"), but the view stays on the current query regardless.
    - "Delete Result" — only shown when an existing result is loaded (i.e., the current query has a saved result). Deletes the result via `deleteResult(resultId)`, removes it from the local `results` array, and resets the form to empty. Styled as a danger/secondary button. Shows a loading spinner during deletion.
    - Save and Save & Next show a loading spinner during save.
    - Save and Save & Next are disabled if there's nothing to save (no screenshots and no books, and no existing result).

**Save flow:**

1. Construct a `FormData` object with:
   - `appId` — the app's `_id`.
   - `queryIndex` — the selected query's index (1–50).
   - `books` — JSON string of the current books array.
   - `existingScreenshots` — JSON string of screenshot paths being kept (not newly added).
   - `screenshots` — any newly selected file(s) appended to the FormData.
2. Call `saveResult(formData)`.
3. On success, update the local results array with the response. The query navigator's completion indicator updates immediately.
4. If "Save & Next" was clicked, advance `selectedQueryIndex` to the next query.

**Initial selection:**

When the page loads, the selected query defaults to:
1. The first query that does NOT have a result yet (first "Not started" query), OR
2. Query #1 if all queries have results.

This provides a sensible starting point for a user who's working through the queries sequentially.

**State:**

All state is local:
- `app` — single app object.
- `queries` — array of all 50 query objects.
- `results` — array of result objects for this app (updated after each save).
- `loading` — boolean (initial page load).
- `saving` — boolean (save in progress).
- `deleting` — boolean (delete in progress).
- `error` — string or null.
- `selectedQueryIndex` — number (1–50), the currently selected query.
- `statusFilter` — string: `''` (all), `'complete'`, `'not-started'`.
- `screenshotFiles` — array of newly-selected File objects (for the current query).
- `screenshotPreviews` — array of URLs for new file previews (created via `URL.createObjectURL`, cleaned up on change).
- `existingScreenshots` — array of screenshot path strings from the loaded result.
- `books` — array of `{ rank, title, author }` objects for the current query.
- `bookInputMode` — string: `'manual'` (default) or `'json'`. Controls which book input view is shown.
- `jsonInput` — string (contents of the JSON textarea in JSON mode).
- `jsonError` — string or null (validation error message for JSON input).
- `newBookTitle` — string (input for the new book title in manual mode).
- `newBookAuthor` — string (input for the new book author in manual mode).

**When switching queries** (clicking a different query in the navigator):

- **No auto-save.** If the user has unsaved changes and clicks a different query, the changes are silently discarded. This is a deliberate simplification — the form is lightweight enough that data loss is minimal, and adding a "save before navigating?" prompt adds complexity. The user should click "Save" or "Save & Next" to persist.
- Load the existing result for the newly selected query (if one exists in the `results` array), or show an empty form.
- Clear `screenshotFiles` and `screenshotPreviews`.
- Reset `bookInputMode` to `'manual'`, clear `jsonInput` and `jsonError`.
- Reset `newBookTitle` and `newBookAuthor` to empty.

### 2. `AppDetailPage.jsx` — Updated Query Progress

The existing AppDetailPage needs two modifications to reflect actual result data:

**Changes:**

1. **Fetch results alongside app and queries**: Add `fetchResults(id)` to the existing `Promise.all()` call.

2. **Compute query status**: For each query in the progress table, check if a result exists:
   - Build a `Set` of `queryIndex` values from the results array.
   - If the set contains the query's index → "Complete" (green text).
   - If not → "Not started" (muted text).

3. **Update progress counter**: Replace hardcoded `0 / {queries.length}` with `{completedCount} / {queries.length}`.

4. **Status styling**:
   - "Complete": `text-emerald-400` with a checkmark or filled circle.
   - "Not started": `text-zinc-500`.

**No other changes** to AppDetailPage — the layout, edit/delete actions, and "Enter Results" button remain the same.

### 3. `src/constants/resultStatus.js`

Status labels and colors used in the progress table.

```js
export const RESULT_STATUS = {
  COMPLETE: 'complete',
  NOT_STARTED: 'not-started',
};

export const RESULT_STATUS_LABELS = {
  [RESULT_STATUS.COMPLETE]: 'Complete',
  [RESULT_STATUS.NOT_STARTED]: 'Not started',
};

export const RESULT_STATUS_COLORS = {
  [RESULT_STATUS.COMPLETE]: 'text-emerald-400',
  [RESULT_STATUS.NOT_STARTED]: 'text-zinc-500',
};
```

---

## Styling

All styling uses **Tailwind CSS 4** classes consistent with the dark theme from Spec 02.

### Two-Panel Layout (ResultsEntryPage)

```
- Page container: flex flex-col h-full
- Content area: flex flex-1 gap-6 overflow-hidden min-h-0
- Left panel (navigator): w-64 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl
                           overflow-y-auto
- Right panel (form): flex-1 overflow-y-auto
```

### Query Navigator (Left Panel)

```
- Header: px-4 py-3 border-b border-zinc-800 text-sm font-semibold text-zinc-300
- Filter dropdown: w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5
                   text-xs text-zinc-300
- Query item: px-4 py-2 cursor-pointer text-sm hover:bg-zinc-800/50 transition-colors
              border-l-2 border-transparent
- Query item (selected): bg-zinc-800 border-l-2 border-indigo-400
- Query item (completed): ● indicator in text-emerald-400
- Query item (not started): ○ indicator in text-zinc-600
- Query text: text-zinc-300 truncate font-mono text-xs
- Query index: text-zinc-500 w-6 text-right mr-2
```

### Entry Form (Right Panel)

```
- Form container: bg-zinc-900 border border-zinc-800 rounded-xl p-6
- Query info: mb-6
  - Index + text: text-xl font-semibold text-zinc-100
  - Description: text-sm text-zinc-400 mt-1
  - Category badge: inline, mt-2
```

### Screenshot Section

```
- Section container: mb-6
- Section header: text-sm font-semibold text-zinc-300 mb-3
- Thumbnail grid: flex flex-wrap gap-3
- Thumbnail container: w-24 h-24 rounded-lg overflow-hidden border border-zinc-700
                       relative group
- Thumbnail <img>: w-full h-full object-cover
- Remove button: absolute top-1 right-1 bg-black/60 text-zinc-300 hover:text-white
                  rounded-full w-5 h-5 flex items-center justify-center text-xs
                  opacity-0 group-hover:opacity-100 transition-opacity
- Upload button: w-24 h-24 rounded-lg border-2 border-dashed border-zinc-700
                 hover:border-zinc-500 flex items-center justify-center
                 text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors
```

### Books Section

```
- Section container: mb-6
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
- Book dash separator: text-zinc-600 mx-2 (between title and author)
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

### Action Buttons

```
- Button container: flex items-center gap-3 mt-6
- Save button: bg-zinc-700 hover:bg-zinc-600 text-zinc-100 px-4 py-2 rounded-lg
               text-sm transition-colors
               disabled:opacity-50 disabled:cursor-not-allowed
- Save & Next button: bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg
                      text-sm transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed
- Delete Result button: ml-auto text-zinc-500 hover:text-rose-400 px-4 py-2 rounded-lg
                        text-sm transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                        (only visible when editing an existing result)
```

### Progress Indicators (AppDetailPage — Updated)

```
- Complete status: text-emerald-400 text-sm, prefix ● (U+25CF)
- Not started status: text-zinc-500 text-sm, prefix ○ (U+25CB)
```

### Loading Skeleton

```
- Left panel: 10 skeleton rows (h-8 bg-zinc-800/50 rounded animate-pulse mb-1)
- Right panel: skeleton card (large block for form area)
```

---

## Routing

No routing changes needed — the route already exists from Spec 02:

- `/apps/:id/results` → `ResultsEntryPage` (`:id` is the app's MongoDB `_id`)

---

## Loading and Error Handling

### Loading States

- **ResultsEntryPage**: Render skeleton for both panels while `loading` is true (initial page load). During save operations, disable buttons and show "Saving..." text.
- **AppDetailPage**: No change to loading — the additional `fetchResults()` call is added to the existing `Promise.all()`.

### Error States

- **ResultsEntryPage**: If initial fetch fails, show a centered error card with the error message and a "Retry" button. If the app is not found (404), show "App not found" with a link back to `/apps`.
- **Save errors**: Display inline error message below the action buttons (red text). The form stays visible so the user can retry.
- **AppDetailPage**: No change — existing error handling covers the page.

### Empty States

- **No result for selected query**: The form shows empty screenshots and books sections. This is the normal starting state — not an "error" or "empty" state requiring special UI.
- **All queries complete**: The query navigator shows all queries with filled circles. The user can still re-enter any query to update results.

---

## UI/UX Considerations

- **Desktop-first**: The two-panel layout is designed for desktop (1200px+). On screens below ~768px, the left panel could stack above the right panel, but implementing responsive stacking is **out of scope** for this spec — the sidebar remains fixed-width.
- **Keyboard accessible**: All form inputs are standard HTML elements. Tab order flows naturally through the form. Enter key in the "Add Book" inputs triggers the add action.
- **No auto-save**: Deliberate choice — saves require explicit button click. This gives users control over when data is persisted and avoids accidental partial saves.
- **Delete from form**: Users can delete an existing result directly from the entry form via the "Delete Result" button, reverting the query to "Not started" status.
- **No drag-and-drop**: Screenshots are uploaded via standard file input, not drag-and-drop. File input is simpler and sufficient for the use case.
- **No "unsaved changes" warning**: When switching queries in the navigator, changes are silently discarded. The form is lightweight and this avoids complexity. Users are expected to click "Save" before navigating.
- **Sequential entry optimized**: "Save & Next" supports rapid sequential data entry. The navigator also supports random access for users who want to jump around.
- **Smart initial selection**: Automatically selects the first incomplete query on page load, so users can pick up where they left off.
- **Screenshot management**: Users can keep, remove, or add screenshots. The `existingScreenshots` mechanism avoids re-uploading files that haven't changed.
- **JSON paste for fast entry**: The JSON mode lets users paste a complete set of books at once — much faster than adding 9 books one by one. This is the expected primary workflow for users who prepare results externally. Manual mode remains available for small edits or adding individual books.
- **Book re-ranking**: When a book is removed (manual mode) or when JSON is applied, books are re-ranked (1, 2, 3, ...) to stay sequential. No gaps.
- **File previews**: Newly selected screenshots show instant previews via `URL.createObjectURL()`. These are revoked on cleanup to prevent memory leaks.

---

## Implementation Plan

- [x] **Step 1 — Create Result model:** Create `server/models/Result.js` with the schema defined above.
- [x] **Step 2 — Create backend routes:** Create `server/routes/results.js` with GET (list/single), POST (upsert), DELETE endpoints. Register in `server/index.js`.
- [x] **Step 3 — Activate cascade delete:** Update `server/routes/apps.js` DELETE handler to delete associated results (`Result.deleteMany({ appId })`).
- [x] **Step 4 — Create mock result data:** Create `src/api/mock/results.js` with mock dataset and handler functions.
- [x] **Step 5 — Update mock handler:** Update `src/api/mock/index.js` to route result requests to mock module + activate cascade delete in app delete handler.
- [x] **Step 6 — Create frontend API module:** Create `src/api/results.js` with `fetchResults()`, `fetchResult()`, `saveResult()`, `deleteResult()`.
- [x] **Step 7 — Create result status constants:** Create `src/constants/resultStatus.js` with status labels and colors.
- [x] **Step 8 — Build ResultsEntryPage:** Replace placeholder with full implementation — two-panel layout, query navigator, screenshot upload, book entry form, save flow.
- [x] **Step 9 — Update AppDetailPage:** Add `fetchResults()` to data loading, compute and display live query progress (complete/not started counts and per-row status).
- [x] **Step 10 — Smoke test:** Verify both pages work with mock API, lint passes, build passes. Test save/next flow, screenshot upload, book add/remove, query navigation, progress display.

---

## Future Considerations (Out of Scope)

- **Screenshot drag-and-drop**: Drag files onto the screenshot area instead of using a file picker.
- **Unsaved changes warning**: Prompt when navigating away with unsaved changes.
- **Book reordering via drag-and-drop**: Drag books to reorder instead of sequential auto-ranking.
- **Screenshot zoom/lightbox**: Click a screenshot thumbnail to view full-size in a lightbox overlay.
- **Per-result deletion from the navigator**: Delete a result directly from the query list instead of requiring entry into the form.
- **OCR from screenshots**: Extract book titles/authors from screenshots automatically.
- **Result timestamps in navigator**: Show when each result was last updated.
- **Keyboard shortcuts**: Ctrl+S to save, Ctrl+Enter for Save & Next.

---

## Clarification Log

**Q1 — Mock handler URL parsing:** The existing queries route already uses `new URL(path, 'http://localhost')` for parsing query params, so the same approach for results is consistent. No change needed.

**Q2 — "Save & Next" with status filter:** Advances to the **next query in the filtered list**, not the next numerically.

**Q3 — "Save & Next" on last filtered item:** Stays on the current query, even if it no longer matches the active filter after saving.

**Q4 — Mock screenshot files:** User will add the mock screenshot image files manually. No fallback/placeholder image needed.

**Q5 — Delete result from entry form:** A **"Delete Result"** button has been added to the action buttons row (right-aligned, danger-styled). Only visible when editing an existing result. Deletes via `deleteResult(resultId)`, removes from local state, resets form to empty.

**Q6 — Add Book behavior (Manual mode):** "Add" button is disabled when either title or author is empty. Inputs clear after successful add. Duplicate books (same title+author) are allowed.

**Q7 — Book validation on Save:** Frontend validates that every book has non-empty title and author before sending. Mongoose schema also enforces `required: true` as backend safeguard.

**Q8 — Multer error handling:** Multer's default 500 response is acceptable. No custom error middleware needed.

---

## Issues & Learnings

- **`screenshotPreviews` ref pattern:** The `useEffect` for loading form data on query switch needs to revoke old `URL.createObjectURL` previews, but including `screenshotPreviews` in the dependency array would cause infinite loops (since the effect resets it). Solution: use a `previewsRef` that mirrors the state, and use the ref for cleanup. Added a single `eslint-disable-next-line` for the intentionally excluded `results` dependency (we only want re-runs on `selectedQueryIndex`/`loading` changes).

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-07 | Spec 05 drafted — Results Entry |
| 2026-02-07 | Spec 05 validated — 8 clarifying questions answered, Delete Result button added, book input validation specified |
| 2026-02-07 | Spec 05 implemented — all 10 steps complete, lint clean (0 warnings), build passes |
