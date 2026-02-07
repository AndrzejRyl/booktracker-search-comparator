# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Book Tracker Search Comparator — a web interface for comparing search results across different book tracking applications. Used to learn baselines and adjust existing search engines to match market standards. Built entirely using AI specifications.

## Commands

- `npm run dev` — start Vite dev server with HMR
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build locally
- `npm run lint` — run ESLint

## Tech Stack

- React 19 with JSX (no TypeScript)
- Vite 7 for bundling
- ESLint with react-hooks and react-refresh plugins

## AI Specification Workflow

Features are developed spec-first using documents in `ai-specs/`. The workflow is:

1. **Create spec** (`/specs/new`): Investigate the codebase (read-only), then write a spec following `ai-specs/00-guidelines.md`. No coding, no commands — spec creation only.
2. **Validate spec** (`/specs/validate`): Review the spec as an experienced React developer. Ask clarifying questions, update the spec with answers. Do not start coding until confirmed ready.
3. **Execute spec** (`/specs/execute`): Build the feature from the spec. Track progress inside the spec document and log any findings or issues encountered.

Specs should include: overview, component breakdown, API contracts with mock data, routing, styling approach, implementation plan, and an issues/learnings section.
