# Spec 02 — Project Setup & Scaffolding

**Version:** 1.0
**Status:** Draft

---

## Overview

This spec transforms the bare Vite + React 19 template into a fully wired project skeleton ready for feature development. It covers:

1. Installing and configuring **Tailwind CSS 4** (dark-only theme).
2. Installing and configuring **React Router v7** with all page routes defined (placeholder content).
3. Building the **AppShell** layout — persistent sidebar navigation + main content area.
4. Creating the **API client** abstraction (`src/api/client.js`) and the **mock API** toggle infrastructure (`src/api/mock/`).
5. Setting up the **Express.js backend** skeleton under `server/` with MongoDB/Mongoose connection, Multer config, and a health-check endpoint.
6. Migrating **environment variables** from `REACT_APP_*` to `VITE_*`.
7. Configuring **`concurrently`** so a single `npm run dev` starts both Vite and Express.
8. Cleaning up the Vite default template files (`App.css`, demo logos, counter code).

No feature logic is built in this spec — only the structural foundation that subsequent specs (03–09) will build on.

---

## Current State of the Codebase

| Item | Status |
|---|---|
| Vite 7 + React 19 | Installed, default template |
| Tailwind CSS | **Not installed** |
| React Router | **Not installed** |
| Express / Mongoose / Multer | **Not installed** |
| `server/` directory | **Does not exist** |
| API client (`src/api/`) | **Does not exist** |
| Environment variables | Use old `REACT_APP_*` prefix — not exposed by Vite |
| `App.jsx` | Default Vite counter demo |
| `index.css` / `App.css` | Default Vite styles (light/dark toggle) |

---

## Directory & File Structure (After This Spec)

```
booktracker-search-comparator/
├── index.html
├── package.json                  # updated — new deps, new scripts
├── vite.config.js                # updated — proxy for /api
├── tailwind.config.js            # (only if Tailwind 4 requires it — see notes)
├── .env.development              # migrated to VITE_* vars
├── .env.staging                  # migrated
├── .env.production               # migrated
├── .gitignore                    # updated — server/uploads/, server/.env
│
├── src/
│   ├── main.jsx                  # updated — wraps App in BrowserRouter
│   ├── index.css                 # replaced — Tailwind directives + dark theme base
│   ├── App.jsx                   # replaced — AppShell + Routes
│   ├── App.css                   # DELETED
│   ├── assets/
│   │   └── react.svg             # can remain (unused, harmless)
│   │
│   ├── layouts/
│   │   └── AppShell.jsx          # sidebar + header + <Outlet />
│   │
│   ├── pages/
│   │   ├── DashboardPage.jsx     # placeholder
│   │   ├── AppsPage.jsx          # placeholder
│   │   ├── AppDetailPage.jsx     # placeholder
│   │   ├── ResultsEntryPage.jsx  # placeholder
│   │   ├── QueriesPage.jsx       # placeholder
│   │   ├── QueryDetailPage.jsx   # placeholder
│   │   ├── ComparePage.jsx       # placeholder
│   │   ├── GoldenPage.jsx        # placeholder
│   │   └── NotFoundPage.jsx      # 404 catch-all
│   │
│   ├── components/
│   │   └── Sidebar.jsx           # navigation links
│   │
│   ├── api/
│   │   ├── client.js             # thin fetch wrapper
│   │   └── mock/
│   │       └── index.js          # mock API toggle entry point (empty stubs)
│
├── server/
│   ├── package.json              # Express, Mongoose, Multer, dotenv, cors
│   ├── .env                      # MONGODB_URI, PORT, UPLOADS_DIR  (gitignored)
│   ├── index.js                  # Entry point — Express app, middleware, MongoDB connect
│   ├── config/
│   │   └── db.js                 # Mongoose connection helper
│   ├── middleware/
│   │   └── upload.js             # Multer config (logos + screenshots)
│   ├── routes/                   # directory created, empty for now
│   ├── models/                   # directory created, empty for now
│   └── uploads/                  # gitignored, created at startup
│       ├── logos/
│       └── results/
│
└── public/
    └── vite.svg                  # can remain or be replaced with app favicon
```

---

## Visual Style & Layout

### Dark Theme Foundation

The app uses a **dark-only** theme. No light mode toggle. The base styling:

- **Background:** `bg-zinc-950` on `<html>`, `bg-zinc-900` on sidebar, `bg-zinc-950` on content area.
- **Text:** `text-zinc-100` for primary, `text-zinc-400` for secondary/muted.
- **Accent:** Indigo — `text-indigo-400`, `bg-indigo-600`, `hover:bg-indigo-500` for interactive elements.
- **Borders:** `border-zinc-800` for card/panel edges.
- **Cards** (for future use): `bg-zinc-900 border border-zinc-800 rounded-xl`.
- **Score colors** (for future use): green (`emerald-400`), yellow (`amber-400`), red (`rose-400`).

### AppShell Layout

```
┌──────────────────────────────────────────────────┐
│  Sidebar (fixed, left)  │  Main Content Area     │
│  ┌──────────────────┐   │  ┌──────────────────┐  │
│  │  App Title/Logo  │   │  │  Page Header     │  │
│  │                  │   │  │                  │  │
│  │  Nav Links:      │   │  │  <Outlet />      │  │
│  │   Dashboard      │   │  │  (page content)  │  │
│  │   Apps           │   │  │                  │  │
│  │   Queries        │   │  │                  │  │
│  │   Compare        │   │  │                  │  │
│  │   Golden Results │   │  │                  │  │
│  │                  │   │  │                  │  │
│  └──────────────────┘   │  └──────────────────┘  │
└──────────────────────────────────────────────────┘
```

- **Sidebar:** `w-64` fixed width, full viewport height, `bg-zinc-900 border-r border-zinc-800`.
- **Main content:** flex-1, scrollable, padded (`p-6` or `p-8`).
- **Active nav link:** `bg-zinc-800 text-indigo-400` with a left border accent (`border-l-2 border-indigo-400`).
- **Inactive nav link:** `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50`.

---

## Component Breakdown

### 1. `src/layouts/AppShell.jsx`

The root layout component. Renders:
- `<Sidebar />` on the left.
- A `<main>` area on the right containing `<Outlet />` from React Router.

```jsx
// Conceptual structure
<div className="flex h-screen bg-zinc-950 text-zinc-100">
  <Sidebar />
  <main className="flex-1 overflow-y-auto p-8">
    <Outlet />
  </main>
</div>
```

### 2. `src/components/Sidebar.jsx`

Contains:
- App title at the top: "Book Search Comparator" (or abbreviated logo).
- A `<nav>` with `<NavLink>` items for each page.
- Each nav item has an icon placeholder (text emoji or simple SVG — no icon library needed for scaffolding) and a label.

Navigation items:

| Label | Route | Icon (placeholder) |
|---|---|---|
| Dashboard | `/` | `📊` |
| Apps | `/apps` | `📱` |
| Queries | `/queries` | `🔍` |
| Compare | `/compare` | `⚖️` |
| Golden Results | `/golden` | `⭐` |

Uses React Router's `<NavLink>` with a callback `className` to apply active/inactive styles.

### 3. Placeholder Pages (`src/pages/*.jsx`)

Each page is a simple component that renders:
- A heading with the page name.
- A short description of what will go here.
- A visual indicator that routing works (e.g., "You are on /apps").

Example:

```jsx
export default function AppsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Apps</h1>
      <p className="text-zinc-400">Manage your tracked book-tracking applications.</p>
    </div>
  );
}
```

Pages to create:

| Component | Route | Description |
|---|---|---|
| `DashboardPage` | `/` | Dashboard / Leaderboard |
| `AppsPage` | `/apps` | App list & management |
| `AppDetailPage` | `/apps/:id` | Single app detail |
| `ResultsEntryPage` | `/apps/:id/results` | Enter/edit results |
| `QueriesPage` | `/queries` | Query bank browser |
| `QueryDetailPage` | `/queries/:id` | Single query detail |
| `ComparePage` | `/compare` | Comparison views |
| `GoldenPage` | `/golden` | Golden results editor |
| `NotFoundPage` | `*` | 404 catch-all |

### 4. `src/api/client.js`

A thin wrapper around `fetch` that:
- Reads `VITE_API_BASE_URL` from `import.meta.env`.
- Checks `VITE_USE_MOCK_API` — if `"true"`, delegates to the mock layer instead of making real HTTP calls.
- Exports helper functions: `get(path)`, `post(path, body)`, `put(path, body)`, `del(path)`.
- For JSON requests, automatically sets `Content-Type: application/json` and parses responses.
- For multipart requests (file uploads), accepts `FormData` and does **not** set `Content-Type` (let the browser set the boundary).
- Throws on non-2xx responses with the parsed error body.

```js
// Conceptual API

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

async function request(method, path, body, isFormData = false) {
  if (USE_MOCK) {
    const mock = await import('./mock/index.js');
    return mock.handleRequest(method, path, body);
  }

  const url = `${BASE_URL}${path}`;
  const options = { method, headers: {} };

  if (body && !isFormData) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  } else if (body && isFormData) {
    options.body = body; // FormData
  }

  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body, isFormData) => request('POST', path, body, isFormData),
  put: (path, body, isFormData) => request('PUT', path, body, isFormData),
  del: (path) => request('DELETE', path),
};
```

### 5. `src/api/mock/index.js`

Skeleton mock handler. For this spec, it only provides the structure — no real mock data yet (that comes in specs 03–06).

```js
// Stub — real mock handlers added by feature specs
export async function handleRequest(method, path, body) {
  console.warn(`[Mock API] No handler for ${method} ${path}`);
  return { message: 'Not implemented' };
}
```

### 6. `server/index.js` (Express Skeleton)

- Imports Express, cors, dotenv.
- Loads `.env` config.
- Connects to MongoDB via `config/db.js`.
- Registers middleware: `cors()`, `express.json()`, static file serving for `/uploads`.
- Starts listening on `PORT` (default 3001).
- Logs startup message.

### 7. `server/config/db.js`

- Uses Mongoose to connect to `MONGODB_URI`.
- Logs success/failure.
- Exports the connection function (called from `index.js` on startup).

### 8. `server/middleware/upload.js`

- Configures Multer with disk storage.
- Two upload presets:
  - `logoUpload` — destination: `uploads/logos/`, max 1 file, max 2MB, image types only.
  - `screenshotUpload` — destination: `uploads/results/`, max 5 files, max 5MB each, image types only.
- File naming: `${Date.now()}-${originalname}` to avoid collisions.
- Exports both presets.

---

## Routing

All routes are declared in `App.jsx` using React Router v7's `<Routes>` and `<Route>`.

```jsx
<Routes>
  <Route element={<AppShell />}>
    <Route index element={<DashboardPage />} />
    <Route path="apps" element={<AppsPage />} />
    <Route path="apps/:id" element={<AppDetailPage />} />
    <Route path="apps/:id/results" element={<ResultsEntryPage />} />
    <Route path="queries" element={<QueriesPage />} />
    <Route path="queries/:id" element={<QueryDetailPage />} />
    <Route path="compare" element={<ComparePage />} />
    <Route path="golden" element={<GoldenPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Route>
</Routes>
```

The `<AppShell />` route uses `<Outlet />` to render nested child pages. All pages share the sidebar navigation.

`main.jsx` wraps `<App />` in `<BrowserRouter>`:

```jsx
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
```

---

## Environment Variables

### Migration: `REACT_APP_*` → `VITE_*`

Vite does not expose `REACT_APP_*` variables. Only `.env.development` is updated in this spec — `.env.staging` and `.env.production` are managed externally and out of scope.

#### `.env.development`
```
VITE_USE_MOCK_API=true
VITE_API_BASE_URL=http://localhost:3001/api
VITE_ENVIRONMENT=LOCAL
VITE_UPLOADS_BASE_URL=http://localhost:3001/uploads
```

#### `server/.env` (new file, gitignored)
```
MONGODB_URI=mongodb://localhost:27017/booktracker-comparator
PORT=3001
UPLOADS_DIR=./uploads
```

---

## Vite Config Updates

`vite.config.js` needs a proxy for development so API calls from the frontend reach the Express server without CORS issues:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
```

> **Note:** Even with the proxy, we keep `cors()` in Express for non-Vite environments (staging/production).

---

## Tailwind CSS 4 Integration

Tailwind CSS 4 uses a CSS-first configuration approach. Installation:

1. Install `tailwindcss` and `@tailwindcss/vite`.
2. Add the Vite plugin to `vite.config.js`.
3. Replace `index.css` with Tailwind's import directive.

### `vite.config.js` (updated)

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/uploads': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
```

### `src/index.css` (replaced)

```css
@import "tailwindcss";

/* Dark-only base */
html {
  color-scheme: dark;
}

body {
  @apply bg-zinc-950 text-zinc-100 antialiased;
  margin: 0;
}
```

No `tailwind.config.js` file is needed — Tailwind 4 auto-detects content sources and the CSS-first approach handles theme customization inline.

---

## Scripts & Dev Workflow

### Root `package.json` — New/Updated Scripts

```json
{
  "scripts": {
    "dev": "concurrently --names \"vite,server\" -c \"cyan,magenta\" \"vite\" \"npm run server:dev\"",
    "server:dev": "node --watch server/index.js",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  }
}
```

- `npm run dev` starts both Vite and the Express server in parallel using `concurrently`.
- `server:dev` uses Node.js built-in `--watch` flag (Node 18+) for auto-restart on file changes — no need for `nodemon`.
- The `--names` and `-c` flags label and color-code the two processes in the terminal.

### New Root Dependencies

```
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite concurrently
```

### Server Dependencies (`server/package.json`)

```json
{
  "name": "booktracker-server",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^5.1.0",
    "mongoose": "^8.x",
    "multer": "^2.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.x"
  }
}
```

> Uses `"type": "module"` for ES module syntax (`import`/`export`) consistent with the frontend.

---

## `.gitignore` Updates

Add these entries:

```
# Server
server/uploads/
server/.env
server/node_modules/
```

---

## `index.html` Update

Update the `<title>` to reflect the app:

```html
<title>Book Search Comparator</title>
```

---

## Cleanup — Files to Remove or Replace

| File | Action |
|---|---|
| `src/App.css` | **Delete** — all styling via Tailwind now |
| `src/App.jsx` | **Replace** — remove counter demo, add route config |
| `src/index.css` | **Replace** — Tailwind directives instead of Vite defaults |
| `src/main.jsx` | **Update** — wrap in `<BrowserRouter>` |
| `public/vite.svg` | **Keep** for now — can be swapped for app favicon later |
| `src/assets/react.svg` | **Keep** — unused but harmless |

---

## Loading and Error Handling

Not applicable for this spec — no data fetching occurs. Future specs will add:
- Skeleton loaders for data-heavy pages.
- Toast/notification system for API errors.
- Loading spinners for async operations.

The API client (`client.js`) does throw on non-2xx responses, so error handling at the call site is ready to be added by consuming specs.

---

## UI/UX Considerations

- **Responsive:** Sidebar collapses on small screens is out of scope for this spec — desktop-first. The sidebar will be visible at all times. No mobile hamburger menu yet.
- **Keyboard navigation:** Nav links are standard `<a>` elements via `<NavLink>`, so keyboard navigation works out of the box.
- **Active route indicator:** Clear visual distinction between active and inactive nav items so the user always knows where they are.

---

## Implementation Plan

- [ ] **Step 1 — Install frontend dependencies:** `react-router-dom`, `tailwindcss`, `@tailwindcss/vite`, `concurrently`.
- [ ] **Step 2 — Configure Tailwind CSS 4:** Add `@tailwindcss/vite` plugin to `vite.config.js`, replace `src/index.css` with Tailwind directives and dark theme base styles.
- [ ] **Step 3 — Migrate environment variables:** Update `.env.development` from `REACT_APP_*` to `VITE_*` with new variables per the spec (`.env.staging` and `.env.production` are out of scope). Add `server/.env` entry to `.gitignore`.
- [ ] **Step 4 — Update Vite config:** Add API/uploads proxy, add Tailwind plugin.
- [ ] **Step 5 — Clean up template files:** Delete `src/App.css`, update `index.html` title.
- [ ] **Step 6 — Create placeholder pages:** Create all 9 page components in `src/pages/` with heading + description.
- [ ] **Step 7 — Build Sidebar component:** Create `src/components/Sidebar.jsx` with nav links for all routes.
- [ ] **Step 8 — Build AppShell layout:** Create `src/layouts/AppShell.jsx` with sidebar + `<Outlet />`.
- [ ] **Step 9 — Set up routing:** Update `src/main.jsx` to wrap in `<BrowserRouter>`, update `src/App.jsx` with `<Routes>` config.
- [ ] **Step 10 — Create API client:** Create `src/api/client.js` with fetch wrapper and mock toggle.
- [ ] **Step 11 — Create mock API stub:** Create `src/api/mock/index.js` with placeholder handler.
- [ ] **Step 12 — Scaffold Express backend:** Create `server/` directory with `package.json`, `index.js`, `config/db.js`, `middleware/upload.js`. Create empty `routes/` and `models/` directories. Create `uploads/` subdirectories.
- [ ] **Step 13 — Install server dependencies:** Run `npm install` inside `server/`.
- [ ] **Step 14 — Update root scripts:** Update root `package.json` with `concurrently` dev script and `server:dev` script.
- [ ] **Step 15 — Update `.gitignore`:** Add `server/uploads/`, `server/.env`, `server/node_modules/`.
- [ ] **Step 16 — Smoke test:** Run `npm run dev`, verify Vite starts, Express starts, sidebar navigation works, all placeholder pages render.

---

## Future Considerations (Out of Scope)

- **Sidebar collapse on mobile** — will be addressed when/if mobile responsiveness becomes a priority.
- **Icon library** — placeholder emoji icons can be swapped for a proper icon set (Lucide, Heroicons) in a later spec.
- **Global state (Context/Reducer)** — will be introduced when cross-page state is first needed (spec 05 or similar).
- **Toast/notification system** — will be built when the first data-mutating feature lands (spec 04 or 05).

---

## Issues & Learnings

*(To be filled during implementation)*

---

## Progress Log

| Date | Update |
|---|---|
| 2026-02-07 | Spec 02 drafted — Project Setup & Scaffolding |
