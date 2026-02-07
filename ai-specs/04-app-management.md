# Spec 04 — App Management

**Version:** 1.0
**Status:** Draft

---

## Overview

This spec defines the **App Management** feature — the mechanism for registering and managing the book-tracking applications that the user wants to compare. It covers:

1. Creating the **Mongoose model** for apps.
2. Implementing **backend CRUD endpoints** (`GET`, `POST`, `PUT`, `DELETE` on `/api/apps`) with logo upload via Multer.
3. Building the **frontend Apps page** (`/apps`) — a card grid of registered apps with an "Add App" flow.
4. Building the **frontend App Detail page** (`/apps/:id`) — displays app info (editable), a progress table of all 50 queries, and a link to results entry.
5. Creating the **mock API layer** for apps so frontend development works without a running backend.
6. Adding an **app API module** on the frontend (`src/api/apps.js`).

Apps are fully user-managed — users can create, edit, and delete apps via the UI.

---

## Dependencies

- **Spec 02 (Project Setup & Scaffolding)** — must be implemented. Provides Express skeleton, Mongoose connection, Multer config, API client, mock infrastructure, routing, and AppShell layout.

> **Note:** Spec 03 (Query Bank) is **not** a dependency for this spec. The App Detail page shows a progress table of all 50 queries, but this is populated using the queries API from Spec 03. If queries are not yet available (e.g., during isolated development), the progress table can show a "No queries loaded" placeholder. In practice, Spec 03 is already implemented.

---

## Data Model

### Mongoose Schema — `App`

**File:** `server/models/App.js`

```js
import mongoose from 'mongoose';

const appSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logo: { type: String, required: true },
  notes: { type: String, default: '', trim: true },
}, {
  timestamps: true,
});

export default mongoose.model('App', appSchema);
```

**Fields:**

| Field | Type | Required | Description                                                                                                   |
|---|---|---|---------------------------------------------------------------------------------------------------------------|
| `name` | String | Yes | The name of the book-tracking app (e.g., "Goodreads", "Uncover")                                              |
| `logo` | String | Yes | Path to the uploaded logo image (e.g., `/uploads/logos/1707300000-goodreads.png`)                              |
| `notes` | String | No | Free-text notes about the app (e.g., "Most popular platform, owned by Amazon")                                |
| `createdAt` | Date | Auto | Mongoose timestamp                                                                                            |
| `updatedAt` | Date | Auto | Mongoose timestamp — also serves as the "last updated" display value                                          |

**Notes:**
- `timestamps: true` adds `createdAt` and `updatedAt` automatically.
- No `lastUpdated` field separate from `updatedAt` — Mongoose timestamps cover this.
- No uniqueness constraint on `name` — the user is a single person and unlikely to add duplicates, and enforcing uniqueness adds friction if they want to track the same app twice (e.g., different accounts).

---

## Backend API

### Routes — `server/routes/apps.js`

Full CRUD for apps. Logo upload uses the existing `logoUpload` middleware from `server/middleware/upload.js`.

#### `GET /api/apps`

Returns all apps, sorted by `name` (alphabetically).

**Response:** `200 OK`

```json
[
  {
    "_id": "664b2c...",
    "name": "Goodreads",
    "logo": "/uploads/logos/1707300000-goodreads.png",
    "notes": "Most popular platform, owned by Amazon",
    "createdAt": "2026-02-01T00:00:00Z",
    "updatedAt": "2026-02-07T00:00:00Z"
  },
  {
    "_id": "664b2d...",
    "name": "Uncover",
    "logo": "/uploads/logos/1707300100-uncover.png",
    "notes": "",
    "createdAt": "2026-02-03T00:00:00Z",
    "updatedAt": "2026-02-03T00:00:00Z"
  }
]
```

#### `POST /api/apps`

Creates a new app. Accepts `multipart/form-data` because of the logo file upload.

**Request body (multipart):**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | text | Yes | App name |
| `notes` | text | No | Free-text notes |
| `logo` | file | Yes | Logo image (max 2MB, image types only) |

**Validation errors:** `400 Bad Request`

```json
{ "message": "Logo is required" }
```

**Response:** `201 Created`

```json
{
  "_id": "664b2e...",
  "name": "StoryGraph",
  "logo": "/uploads/logos/1707300123-storygraph.png",
  "notes": "Focus on stats",
  "createdAt": "2026-02-07T12:00:00Z",
  "updatedAt": "2026-02-07T12:00:00Z"
}
```

**Validation errors:** `400 Bad Request`

```json
{ "message": "App name is required" }
```

#### `GET /api/apps/:id`

Returns a single app by MongoDB `_id`.

**Response:** `200 OK` — same shape as a single object from `GET /api/apps`.

**Error:** `404 Not Found`

```json
{ "message": "App not found" }
```

#### `PUT /api/apps/:id`

Updates an existing app. Accepts `multipart/form-data` to allow logo changes.

**Request body (multipart):**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | text | Yes | Updated app name |
| `notes` | text | No | Updated notes |
| `logo` | file | No | New logo image (replaces existing). If not sent, the existing logo is preserved |

**Response:** `200 OK` — the updated app object.

**Error:** `404 Not Found` if the app doesn't exist.

**Note:** When a new logo is uploaded, the old logo file is **not** deleted from disk. This is a deliberate simplification — disk cleanup is a future enhancement. Deleting old files adds complexity (error handling, race conditions) with minimal benefit for a single-user tool.

#### `DELETE /api/apps/:id`

Deletes an app and all its associated results.

**Response:** `200 OK`

```json
{ "message": "App deleted" }
```

**Error:** `404 Not Found` if the app doesn't exist.

**Note:** This endpoint also deletes all `results` documents where `appId` matches the deleted app (cascade delete). However, since the Results model doesn't exist yet (Spec 05), the cascade delete logic will be added as a comment placeholder in this spec and activated in Spec 05. For now, deleting an app only removes the app document itself.

### Route Registration

In `server/index.js`, import and mount the apps router:

```js
import appsRouter from './routes/apps.js';

// After existing routes:
app.use('/api/apps', appsRouter);
```

### Route Implementation — Conceptual

```js
import { Router } from 'express';
import App from '../models/App.js';
import { logoUpload } from '../middleware/upload.js';

const router = Router();

// GET /api/apps
router.get('/', async (req, res) => {
  try {
    const apps = await App.find().sort({ name: 1 });
    res.json(apps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/apps/:id
router.get('/:id', async (req, res) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/apps
router.post('/', logoUpload, async (req, res) => {
  try {
    const { name, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'App name is required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Logo is required' });
    }

    const appData = {
      name: name.trim(),
      notes: notes?.trim() || '',
      logo: `/uploads/logos/${req.file.filename}`,
    };

    const app = await App.create(appData);
    res.status(201).json(app);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/apps/:id
router.put('/:id', logoUpload, async (req, res) => {
  try {
    const app = await App.findById(req.params.id);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }

    const { name, notes } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'App name is required' });
    }

    app.name = name.trim();
    app.notes = notes?.trim() || '';
    if (req.file) {
      app.logo = `/uploads/logos/${req.file.filename}`;
    }

    await app.save();
    res.json(app);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/apps/:id
router.delete('/:id', async (req, res) => {
  try {
    const app = await App.findByIdAndDelete(req.params.id);
    if (!app) {
      return res.status(404).json({ message: 'App not found' });
    }
    // TODO (Spec 05): Delete all results where appId === req.params.id
    res.json({ message: 'App deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
```

---

## Frontend API Module

### `src/api/apps.js`

A thin module that calls the API client for app-related endpoints.

```js
import { api } from './client.js';

export async function fetchApps() {
  return api.get('/apps');
}

export async function fetchApp(id) {
  return api.get(`/apps/${id}`);
}

export async function createApp(formData) {
  return api.post('/apps', formData, true);
}

export async function updateApp(id, formData) {
  return api.put(`/apps/${id}`, formData, true);
}

export async function deleteApp(id) {
  return api.del(`/apps/${id}`);
}
```

**Notes:**
- `createApp` and `updateApp` pass `true` as the third argument (`isFormData`) because the API expects `multipart/form-data` for logo uploads.
- The caller is responsible for constructing a `FormData` object with `name`, `notes`, and `logo` fields. Logo is required on create; on update, omitting the logo file preserves the existing one.

---

## Mock API Layer

### `src/api/mock/apps.js`

Contains mock app data and handler functions that mimic the backend CRUD behavior.

```js
let nextId = 6;

let MOCK_APPS = [
  {
    _id: 'app1',
    name: 'Goodreads',
    logo: '/uploads/logos/mock-goodreads.png',
    notes: 'Most popular platform, owned by Amazon. Largest catalog of user reviews.',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-07T00:00:00Z',
  },
  {
    _id: 'app2',
    name: 'Hardcover',
    logo: '/uploads/logos/mock-hardcover.png',
    notes: 'Modern interface, community-driven. Newer entrant with growing catalog.',
    createdAt: '2026-02-02T00:00:00Z',
    updatedAt: '2026-02-06T00:00:00Z',
  },
  {
    _id: 'app3',
    name: 'StoryGraph',
    logo: '/uploads/logos/mock-storygraph.png',
    notes: 'Focus on mood and pacing. Independent alternative to Goodreads.',
    createdAt: '2026-02-03T00:00:00Z',
    updatedAt: '2026-02-05T00:00:00Z',
  },
  {
    _id: 'app4',
    name: 'LibraryThing',
    logo: '/uploads/logos/mock-librarything.png',
    notes: 'Cataloging-focused with deep metadata. Older but feature-rich.',
    createdAt: '2026-02-04T00:00:00Z',
    updatedAt: '2026-02-04T00:00:00Z',
  },
  {
    _id: 'app5',
    name: 'Uncover',
    logo: '/uploads/logos/mock-uncover.png',
    notes: 'Book tracker for mood readers. Great for reading challenges.',
    createdAt: '2026-02-05T00:00:00Z',
    updatedAt: '2026-02-05T00:00:00Z',
  },
];

export function getApps() {
  return [...MOCK_APPS].sort((a, b) => a.name.localeCompare(b.name));
}

export function getAppById(id) {
  return MOCK_APPS.find((a) => a._id === id) || null;
}

export function createApp(body) {
  const now = new Date().toISOString();
  const name = body.get ? body.get('name') : body.name;
  if (!name || !name.trim()) {
    throw new Error('App name is required');
  }
  const id = nextId++;
  const newApp = {
    _id: `app${id}`,
    name: name.trim(),
    logo: `/uploads/logos/mock-app${id}.png`, // Mock simulates a logo path
    notes: ((body.get ? body.get('notes') : body.notes) || '').trim(),
    createdAt: now,
    updatedAt: now,
  };
  MOCK_APPS.push(newApp);
  return { ...newApp };
}

export function updateApp(id, body) {
  const app = MOCK_APPS.find((a) => a._id === id);
  if (!app) throw new Error('App not found');

  const name = body.get ? body.get('name') : body.name;
  if (!name || !name.trim()) {
    throw new Error('App name is required');
  }
  app.name = name.trim();
  app.notes = ((body.get ? body.get('notes') : body.notes) || '').trim();
  app.updatedAt = new Date().toISOString();
  return { ...app };
}

export function deleteAppById(id) {
  const index = MOCK_APPS.findIndex((a) => a._id === id);
  if (index === -1) throw new Error('App not found');
  MOCK_APPS.splice(index, 1);
  return { message: 'App deleted' };
}
```

**Notes:**
- Mock uses `let` for `MOCK_APPS` so mutations (create/update/delete) are reflected within the session.
- `body` can be either a plain object or a `FormData` instance — the mock checks for `body.get` to handle both cases. In practice, the frontend always sends `FormData` for create/update, but the mock handles both for resilience.
- Logo paths in mock mode are synthetic (e.g., `/uploads/logos/mock-goodreads.png`) — these won't resolve to real images. The UI will show a broken image in mock mode, which is acceptable for development. During real usage the backend serves actual uploaded files.

### Update `src/api/mock/index.js`

**Append** app route matching above the fallback, after the existing query routes:

```js
import { getQueries, getQueryByIndex } from './queries.js';
import { getApps, getAppById, createApp, updateApp, deleteAppById } from './apps.js';

export async function handleRequest(method, path, body) {
  // --- Query routes ---
  // (existing query routes remain unchanged)

  // --- App routes ---

  // GET /api/apps
  if (method === 'GET' && path === '/apps') {
    return getApps();
  }

  // POST /api/apps
  if (method === 'POST' && path === '/apps') {
    return createApp(body);
  }

  // GET /api/apps/:id
  const appGetMatch = path.match(/^\/apps\/([a-zA-Z0-9]+)$/);
  if (method === 'GET' && appGetMatch) {
    const app = getAppById(appGetMatch[1]);
    if (!app) throw new Error('App not found');
    return app;
  }

  // PUT /api/apps/:id
  const appPutMatch = path.match(/^\/apps\/([a-zA-Z0-9]+)$/);
  if (method === 'PUT' && appPutMatch) {
    return updateApp(appPutMatch[1], body);
  }

  // DELETE /api/apps/:id
  const appDeleteMatch = path.match(/^\/apps\/([a-zA-Z0-9]+)$/);
  if (method === 'DELETE' && appDeleteMatch) {
    return deleteAppById(appDeleteMatch[1]);
  }

  // --- Fallback (preserve for future specs) ---
  console.warn(`[Mock API] No handler for ${method} ${path}`);
  return { message: 'Not implemented' };
}
```

**Note on regex pattern:** The `[a-zA-Z0-9]+` pattern matches both mock IDs (`app1`, `app2`) and MongoDB ObjectIds (`664b2c...`). This ensures the mock handler works correctly in both mock and real mode if the path happens to be checked.

---

## Frontend Pages

### Directory & File Structure (New/Modified Files)

```
src/
├── api/
│   ├── apps.js                  # NEW — app API module
│   └── mock/
│       ├── index.js             # MODIFIED — add app route handlers
│       └── apps.js              # NEW — mock app data
├── pages/
│   ├── AppsPage.jsx             # MODIFIED — full implementation
│   └── AppDetailPage.jsx        # MODIFIED — full implementation
├── components/
│   └── AppFormModal.jsx         # NEW — add/edit app modal
```

### 1. `AppsPage.jsx` — App List & Management (`/apps`)

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  Apps                                              [ + Add App ] │
│  Manage the book-tracking applications you're comparing.         │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   [logo]     │  │   [logo]     │  │   [logo]     │           │
│  │              │  │              │  │              │           │
│  │  Goodreads   │  │  Hardcover   │  │  StoryGraph  │           │
│  │              │  │              │  │              │           │
│  │  Most popular│  │  Modern      │  │  Focus on    │           │
│  │  platform... │  │  interface.. │  │  mood and... │           │
│  │              │  │              │  │              │           │
│  │  Updated     │  │  Updated     │  │  Updated     │           │
│  │  Feb 7, 2026 │  │  Feb 6, 2026 │  │  Feb 5, 2026 │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐                              │
│  │   [logo]     │  │   [logo]     │                              │
│  │              │  │              │                              │
│  │  LibraryThing│  │  Uncover     │                              │
│  │              │  │              │                              │
│  │  Cataloging- │  │  For mood    │                              │
│  │  focused...  │  │  readers...  │                              │
│  │              │  │              │                              │
│  │  Updated     │  │  Updated     │                              │
│  │  Feb 4, 2026 │  │  Feb 5, 2026 │                              │
│  └──────────────┘  └──────────────┘                              │
│                                                                   │
│  5 apps tracked                                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- On mount, fetches all apps via `fetchApps()`.
- **Card grid layout**: Responsive grid of app cards using `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6`.
- **Each card** displays:
  - Logo image (always present — required on creation).
  - App name (bold).
  - Notes (truncated to 2 lines with `line-clamp-2`).
  - Last updated date (formatted as "Feb 7, 2026" — use `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`).
- **Clicking a card** navigates to `/apps/:id` (the app detail page).
- **"Add App" button** in the page header opens the `AppFormModal` in create mode.
- After successfully creating an app, the apps list refetches and the new app appears in the grid.
- Shows a **loading skeleton** while fetching (6 skeleton cards with pulsing placeholders).
- Shows an **error state** if the fetch fails (message + retry button).
- Shows an **empty state** if no apps exist: "No apps tracked yet. Add your first book-tracking app to get started." with an "Add App" button.
- Shows count below the grid: "X apps tracked".

**State:**

All state is local:
- `apps` — array of app objects.
- `loading` — boolean.
- `error` — string or null.
- `showAddModal` — boolean controlling the AppFormModal visibility.

### 2. `AppDetailPage.jsx` — Single App Detail (`/apps/:id`)

**Layout:**

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Back to Apps                                                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  [logo]                                                     │  │
│  │                                                             │  │
│  │  Goodreads                                      [Edit] [Delete]│
│  │  Most popular platform, owned by Amazon.                    │  │
│  │  Added Feb 1, 2026 · Updated Feb 7, 2026                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Query Progress                                   0 / 50    │  │
│  │                                                             │  │
│  │  ┌────┬──────────────────────┬────────────┬──────────────┐ │  │
│  │  │ #  │ Query                │ Category   │ Status       │ │  │
│  │  ├────┼──────────────────────┼────────────┼──────────────┤ │  │
│  │  │ 1  │ the hunger games     │ baseline   │ Not started  │ │  │
│  │  │ 2  │ pride and prejudice  │ baseline   │ Not started  │ │  │
│  │  │ …  │ …                    │ …          │ …            │ │  │
│  │  └────┴──────────────────────┴────────────┴──────────────┘ │  │
│  │                                                             │  │
│  │  [Enter Results →]                                          │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**Behavior:**

- Reads `id` (MongoDB `_id`) from route params via `useParams()`.
- Fetches app data via `fetchApp(id)` and all queries via `fetchQueries()` (from `src/api/queries.js`, Spec 03).
- Displays app info: logo, name, notes, dates.
- **"Edit" button** opens `AppFormModal` in edit mode, pre-populated with the app's current data. After saving, the app data refetches.
- **"Delete" button** shows a confirmation dialog (browser `window.confirm()` — no custom modal needed). If confirmed, calls `deleteApp(id)` and navigates to `/apps` on success.
- **Query Progress section**: table listing all 50 queries with their status for this app.
  - **Status column**: For this spec, all queries show "Not started" since the Results API (Spec 05) doesn't exist yet. The status will be computed in Spec 05 by checking whether a `results` document exists for this app + query combination.
  - Progress summary: "0 / 50" in the section header (count of completed queries / total queries). Will be dynamic once results are available.
  - Each row shows: query index, query text (font-mono), category badge, status indicator.
- **"Enter Results" button** navigates to `/apps/:id/results` (Results Entry page — placeholder from Spec 02, implemented in Spec 05).
- **"Back to Apps"** link navigates to `/apps`.
- Shows **loading skeleton** while fetching.
- Shows **error state** if fetch fails or app not found (404 → "App not found" with link back to `/apps`).

**State:**

- `app` — single app object or null.
- `queries` — array of all 50 queries (for the progress table).
- `loading` — boolean.
- `error` — string or null.
- `showEditModal` — boolean controlling the AppFormModal visibility.

### 3. `AppFormModal.jsx` — Add/Edit App Modal

A modal component for creating and editing apps. Used in both AppsPage (create) and AppDetailPage (edit).

**Layout:**

```
┌──────────────────────────────────────────────────┐
│  Add App  /  Edit App                     [ × ]  │
│                                                   │
│  App Name *                                       │
│  ┌─────────────────────────────────────────────┐ │
│  │ e.g. Goodreads                              │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  Logo *                                            │
│  ┌─────────────────────────────────────────────┐ │
│  │  [Choose file]  No file chosen              │ │
│  └─────────────────────────────────────────────┘ │
│  (or current logo preview if editing)            │
│                                                   │
│  Notes                                            │
│  ┌─────────────────────────────────────────────┐ │
│  │                                             │ │
│  │                                             │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│            [ Cancel ]  [ Save App ]               │
└──────────────────────────────────────────────────┘
```

**Props:**

| Prop | Type | Description |
|---|---|---|
| `isOpen` | boolean | Controls visibility |
| `onClose` | function | Called when modal is dismissed (Cancel, X, or backdrop click) |
| `onSave` | function | Called after successful save — parent should refetch data |
| `app` | object or null | If provided, modal is in edit mode with fields pre-populated. If null, modal is in create mode |

**Behavior:**

- **Modal overlay**: semi-transparent dark backdrop (`bg-black/60`), centered modal card.
- **Close on backdrop click**: clicking outside the modal closes it.
- **Close on Escape key**: pressing Escape closes the modal.
- **Form fields:**
  - Name (text input, required). Validates on submit — shows inline error "App name is required" if empty.
  - Logo (file input, required in create mode). Shows a preview of the selected/existing logo above the file input. In edit mode, shows the current logo — selecting a new file replaces the preview. In create mode, validates on submit — shows inline error "Logo is required" if no file selected. Accepts image files only (`.jpg, .jpeg, .png, .gif, .webp`).
  - Notes (textarea, optional). 3 rows.
- **Submit:** Constructs a `FormData` object and calls `createApp(formData)` or `updateApp(id, formData)`. Shows a loading state on the Save button during submission.
- **Error handling:** If the API call fails, show the error message inline above the form buttons (red text). The modal stays open so the user can retry.
- On successful save, calls `onSave()` and closes the modal.

**State:**

- `name` — string.
- `notes` — string.
- `logoFile` — File object or null (the newly selected file).
- `logoPreview` — string URL for preview (existing logo URL in edit mode, or object URL of selected file).
- `saving` — boolean.
- `formError` — string or null.

---

## Styling

All styling uses **Tailwind CSS 4** classes consistent with the dark theme from Spec 02.

### App Card (AppsPage)

```
- Card container: bg-zinc-900 border border-zinc-800 rounded-xl p-5
                  hover:border-zinc-700 cursor-pointer transition-colors
- Logo container: w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden mb-4
                  (fixed size — all logos display at the same dimensions regardless of source image size)
- Logo <img>: w-full h-full object-cover (scales and crops to fill the container)
- App name: text-lg font-semibold text-zinc-100 mb-1
- Notes: text-sm text-zinc-400 line-clamp-2 mb-3
- Date: text-xs text-zinc-500
```

### App Info Card (AppDetailPage)

```
- Card: bg-zinc-900 border border-zinc-800 rounded-xl p-6
- Logo container: w-20 h-20 rounded-xl overflow-hidden (fixed size, larger than card grid version)
- Logo <img>: w-full h-full object-cover
- Name: text-2xl font-bold text-zinc-100
- Notes: text-zinc-400
- Dates: text-sm text-zinc-500
- Edit button: text-indigo-400 hover:text-indigo-300 border border-zinc-700
               rounded-lg px-4 py-2 text-sm
- Delete button: text-rose-400 hover:text-rose-300 border border-zinc-700
                 rounded-lg px-4 py-2 text-sm
```

### Query Progress Table (AppDetailPage)

Same table styling as QueriesPage:

```
- Table container: bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden
- Header row: bg-zinc-800/50 text-zinc-400 text-xs uppercase tracking-wider
- Body rows: border-t border-zinc-800 hover:bg-zinc-800/30 transition-colors
- Status "Not started": text-zinc-500
- Status "Complete": text-emerald-400  (future — Spec 05)
- Status "In progress": text-amber-400 (future — Spec 05)
```

### Modal Styling

```
- Backdrop: fixed inset-0 bg-black/60 z-50 flex items-center justify-center
- Modal card: bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md
              shadow-xl
- Title: text-xl font-bold text-zinc-100 mb-6
- Input labels: text-sm font-medium text-zinc-300 mb-1
- Text input: w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2
              text-zinc-100 placeholder-zinc-500
              focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
- Textarea: same as text input, resize-none
- File input: styled as a block with bg-zinc-800 border border-zinc-700 rounded-lg
              file:bg-zinc-700 file:text-zinc-300 file:border-0 file:px-4 file:py-2
              file:mr-4 file:rounded-lg file:cursor-pointer
- Logo preview container: w-16 h-16 rounded-xl overflow-hidden mb-2
- Logo preview <img>: w-full h-full object-cover
- Cancel button: text-zinc-400 hover:text-zinc-100 px-4 py-2
- Save button: bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg
               disabled:opacity-50 disabled:cursor-not-allowed
- Error text: text-sm text-rose-400 mt-2
```

### Loading Skeleton (AppsPage)

```
- 6 skeleton cards in a responsive grid
- Each card: bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse
- Contains: circle placeholder (logo), rectangle placeholder (name), two line placeholders (notes)
```

### Loading Skeleton (AppDetailPage)

```
- Info card: wide rectangle placeholders for name, notes, dates. animate-pulse
- Progress table: 5 skeleton rows (same as QueriesPage pattern)
```

---

## Routing

No routing changes needed — the routes already exist from Spec 02:

- `/apps` → `AppsPage`
- `/apps/:id` → `AppDetailPage` (`:id` is the MongoDB `_id`)

**Note:** Unlike queries (which use `index` 1–50 in URLs), apps use MongoDB `_id` in URLs. This is because apps are user-created with dynamic IDs, not seeded with stable numeric indices.

---

## Loading and Error Handling

### Loading States

- **AppsPage**: Render 6 skeleton cards in a grid (pulsing `animate-pulse` blocks) while `loading` is true.
- **AppDetailPage**: Render skeleton card for app info + skeleton rows for query table while loading.
- **AppFormModal**: Disable the Save button and show a spinner/text "Saving…" during API call.

### Error States

- **AppsPage**: If fetch fails, show a centered error card with the error message and a "Retry" button.
- **AppDetailPage**: If fetch fails, show error message. If 404 (app not found), show "App not found" with a link back to `/apps`.
- **AppFormModal**: If save fails, show inline error message (red text) above the form buttons. Modal stays open for retry.
- **Delete failure**: If delete fails, show a browser `alert()` with the error message. (No toast system yet.)

### Empty State

- **AppsPage**: If no apps exist, show "No apps tracked yet. Add your first book-tracking app to get started." with an "Add App" button.

---

## UI/UX Considerations

- **Desktop-first**: Card grid adapts from 1 to 4 columns depending on screen width. On small screens, the grid becomes a single column stack.
- **Keyboard accessible**: Cards are wrapped in `<Link>` or use `onClick` + `role="link"` with `tabIndex`. Modal closes on Escape. Form inputs are standard HTML elements.
- **Optimistic UX**: No optimistic updates in this spec — after create/update/delete, refetch the data from the API to ensure consistency. The API is local and fast, so the latency is negligible.
- **Confirmation before delete**: Uses `window.confirm()` for simplicity. A custom confirmation modal is a future enhancement.
- **Logo required**: Every app must have a logo. No fallback/placeholder — the "Add App" form enforces this. Logo is always displayed as-is using `object-cover`. The 2MB limit from Multer ensures files stay reasonable.
- **FormData for all create/update calls**: The frontend always uses `FormData` for create and update. On create, the logo file is required. On update, the logo file is optional (existing logo is preserved if not replaced).

---

## Implementation Plan

- [ ] **Step 1 — Create Mongoose model:** Create `server/models/App.js` with the schema defined above.
- [ ] **Step 2 — Create backend routes:** Create `server/routes/apps.js` with all 5 CRUD endpoints. Register in `server/index.js`.
- [ ] **Step 3 — Test backend endpoints:** Use `curl` or a REST client to verify all CRUD operations work, including logo upload.
- [ ] **Step 4 — Create mock app data:** Create `src/api/mock/apps.js` with the mock dataset and CRUD handler functions.
- [ ] **Step 5 — Update mock handler:** Update `src/api/mock/index.js` to route app-related requests to the mock module.
- [ ] **Step 6 — Create frontend API module:** Create `src/api/apps.js` with `fetchApps()`, `fetchApp()`, `createApp()`, `updateApp()`, `deleteApp()`.
- [ ] **Step 7 — Build AppFormModal component:** Create `src/components/AppFormModal.jsx` with create/edit form, file upload, validation, and modal behavior.
- [ ] **Step 8 — Build AppsPage:** Replace placeholder with full implementation — card grid, add app button, loading/error/empty states.
- [ ] **Step 9 — Build AppDetailPage:** Replace placeholder with full implementation — app info card, edit/delete actions, query progress table, loading/error states.
- [ ] **Step 10 — Smoke test:** Verify all pages work with mock API. Test create, edit, delete flows. Lint passes, build passes.

---

## Future Considerations (Out of Scope)

- **Result counts per app** in the AppsPage cards (e.g., "32 / 50 queries completed") — requires Results API from Spec 05.
- **Query progress status** in the AppDetailPage table (not started / in progress / complete) — requires Results API from Spec 05.
- **Cascade delete** of results when an app is deleted — will be implemented in Spec 05 when the Result model exists.
- **Logo cropping/resizing** — uploaded images are displayed as-is with `object-cover`.
- **Old logo cleanup** on re-upload — old files remain on disk.
- **Toast/notification system** for success messages (e.g., "App created successfully") — can be added in a cross-cutting spec.
- **Drag-and-drop logo upload** — standard file input is sufficient.
- **App sorting/filtering** on the AppsPage — with 5–10 apps max, a grid is sufficient without search/filter controls.
- **Custom confirmation modal** for delete — `window.confirm()` is adequate for a single-user tool.

---

## Issues & Learnings

*(To be filled during implementation)*

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-07 | Spec 04 drafted — App Management |
