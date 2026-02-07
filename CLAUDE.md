# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Book Tracker Search Comparator — a web interface for comparing search results across different book tracking applications (Goodreads, Hardcover, StoryGraph, LibraryThing, Uncover). Used to learn baselines and adjust existing search engines to match market standards. Built entirely using AI specifications.

## Commands

- `npm run dev` — start Vite + Express concurrently with HMR and `--watch`
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build locally
- `npm run lint` — run ESLint
- `npm run seed:queries` — seed MongoDB with 50 queries from `server/data/queries.json`

## Tech Stack

- **Frontend:** React 19 with JSX (no TypeScript), React Router v7, Tailwind CSS 4 (dark theme only)
- **Backend:** Express.js, MongoDB with Mongoose, Multer for file uploads
- **Build:** Vite 7, Concurrently for parallel dev servers
- **Linting:** ESLint with react-hooks and react-refresh plugins

## Architecture

### Frontend (`src/`)

- **Pages (10):** Dashboard, Apps, AppDetail, ResultsEntry, Queries, QueryDetail, Compare, Golden, Leaderboard, NotFound
- **Components (8):** Sidebar, AppFormModal, QueryCategoryBadge, SideBySideView, QueryMatrixView, BreakdownView, ScreenshotLightbox
- **API layer (`src/api/`):** Thin fetch wrapper (`client.js`) with per-feature modules (`apps.js`, `queries.js`, `results.js`, `golden.js`, `scores.js`). Toggled between real backend and mock API via `VITE_USE_MOCK_API` env var.
- **Mock API (`src/api/mock/`):** Full mock dataset (5 apps, 50 queries, sample results/golden data) with request routing. Mutations persist within session.
- **Constants (`src/constants/`):** Query categories, score colors, compare view definitions, result statuses
- **Utils (`src/utils/`):** Golden match logic (normalization, exact matching, counting)

### Backend (`server/`)

- **Models:** Query, App, Result, GoldenResult (Mongoose schemas)
- **Routes:** `/api/queries`, `/api/apps`, `/api/results`, `/api/golden`, `/api/scores`
- **File uploads:** Multer middleware for logos (`uploads/logos/`) and screenshots (`uploads/results/`)
- **Seed script:** `server/scripts/seed-queries.js` populates 50 queries

### Environment

- `.env.development` — local dev config (`VITE_USE_MOCK_API`, `VITE_API_BASE_URL`, `VITE_UPLOADS_BASE_URL`)
- `server/.env` — backend config (`MONGODB_URI`, `PORT`, `UPLOADS_DIR`) — gitignored

## AI Specification Workflow

Features are developed spec-first using documents in `ai-specs/`. The workflow is:

1. **Create spec** (`/specs/new`): Investigate the codebase (read-only), then write a spec following `ai-specs/00-guidelines.md`. No coding, no commands — spec creation only.
2. **Validate spec** (`/specs/validate`): Review the spec as an experienced React developer. Ask clarifying questions, update the spec with answers. Do not start coding until confirmed ready.
3. **Execute spec** (`/specs/execute`): Build the feature from the spec. Track progress inside the spec document and log any findings or issues encountered.

Specs should include: overview, component breakdown, API contracts with mock data, routing, styling approach, implementation plan, and an issues/learnings section.

All 9 specs (01–09) have been implemented. See `ai-specs/` for full documentation.

## Code Patterns

### Page component structure — render helpers

Pages with loading/error/content states use **inner render helper functions** instead of early returns. This keeps the page header rendered once and makes the component body flat and readable.

```jsx
export default function SomePage() {
  // state, effects, derived data...

  const renderSkeleton = () => ( /* loading skeleton */ );
  const renderError = () => ( /* error card + retry */ );
  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    return ( /* main content */ );
  };

  return (
    <div>
      <h1>Page Title</h1>
      {renderContent()}
    </div>
  );
}
```

### Shared constants

Constants shared across components (e.g., label maps, color maps) go in `src/constants/` — **not** co-exported from component files, since the `react-refresh` ESLint plugin disallows mixed component + constant exports.

### Styling conventions

- Dark theme only: `bg-zinc-950` base, `text-zinc-100` text, `bg-zinc-900` cards
- Accent color: indigo (`bg-indigo-600`, `text-indigo-400`)
- Score colors: emerald (>=80%), amber (40-80%), rose (<40%) — defined in `src/constants/scoreColors.js`
- Cards: `bg-zinc-900 border border-zinc-800 rounded-xl`
