# ACME Salary: web app

React 19 + TypeScript single-page app, built with Vite. It uses Mantine for components, TanStack Query for data fetching and React Router for routing. It talks to the Rails API in [`../backend`](../backend).

## Setup

```sh
npm install
cp .env.example .env.local   # optional; every variable has a default
npm run dev                  # http://localhost:5173
```

Start the API first (`bin/rails server` in `backend/`). By default the app calls `http://localhost:3000`.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000` | API base URL, without `/api/v1` |
| `VITE_APP_NAME` | `ACME Salary` | Name in the header and browser tab |
| `VITE_HR_USER_NAME` | `Jordan Rivera` | Demo HR profile shown in the header (there is no sign-in) |
| `VITE_HR_USER_ROLE` | `HR Manager` | Role shown under the demo profile name |

Values are fixed at build time.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Vitest and Testing Library, once (`npm run test:watch` to watch) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript project check |
| `npm run build` | Type check and production build to `dist/` |

## Pages

- `/`: Dashboard, with headcount and estimated monthly and annual salary cost in a chosen display currency.
- `/employees`: directory, and `/employees/:id`, the profile and salary history.
- `/insights`: monthly cost by department, annual salary range by role, and annual salary distribution by country.

## Layout

See "Frontend structure" and "UI design" in [`docs/architecture.md`](../docs/architecture.md#frontend-structure).
