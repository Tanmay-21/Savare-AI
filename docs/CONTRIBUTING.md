# Contributing Guide

## Prerequisites

- Node.js 18+
- A Supabase project (free tier is sufficient for development)

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + API credentials (see README)
```

Open two terminals:

```bash
# Terminal 1 — Express API server (port 3001)
npm start

# Terminal 2 — Vite frontend (port 3000)
npm run dev
```

Vite proxies all `/api/*` requests to the Express server automatically. Visit `http://localhost:3000`.

For Supabase schema setup (tables, RPC functions), see the SQL migrations in the [README](../README.md#2-run-database-migrations).

## Available Scripts

<!-- AUTO-GENERATED -->
| Command | Description |
|---------|-------------|
| `npm start` | Start Express API server (uses `$PORT`, defaults to 3001) |
| `npm run dev` | Start Vite frontend on port 3000 (proxies `/api/*` to port 3001) |
| `npm run build` | Production build of the frontend, outputs to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | TypeScript type-check only (`tsc --noEmit`) |
| `npm run clean` | Delete `dist/` |
| `npm test` | Run unit tests with Vitest |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Coverage report (target: 80%) |
<!-- AUTO-GENERATED -->

## Environment Variables

<!-- AUTO-GENERATED -->
| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Yes | Browser | Supabase project URL — embedded in browser bundle |
| `VITE_SUPABASE_ANON_KEY` | Yes | Browser | Supabase anonymous key — embedded in browser bundle |
| `VITE_API_BASE_URL` | Yes (prod) | Browser | Railway API URL — leave empty in local dev (Vite proxy handles it) |
| `SUPABASE_URL` | Yes | Server only | Supabase project URL — used by the Express API server |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Supabase service role key — **never expose to browser** |
| `FRONTEND_URL` | Yes (prod) | Server only | Vercel app URL — configures CORS on the Railway server |
<!-- AUTO-GENERATED -->

## Demo Mode

Any visitor can click "Continue as Guest" on the login page. This calls `POST /api/auth/demo` which:
1. Creates a real (anonymous) Supabase auth user with a random email
2. Creates a demo profile row (`is_demo: true`, `is_verified: true`)
3. Returns a JWT — the rest of the app behaves identically for demo users

Demo sessions are rate-limited to 5 per IP per hour. Demo data is real data in Supabase — clean up periodically with a scheduled Supabase function if needed.

## Code Style

- **Tailwind CSS v4** via Vite plugin — no `tailwind.config.js`
- Use `cn()` from `src/utils/cn.ts` for conditional class merging
- All shared TypeScript types live in `src/types.ts`
- Branding strings (`APP_NAME`, `APP_LOGO_URL`) come from `src/constants/branding.ts` — never hardcode them
- API errors should use `ApiError` from `api/lib/validate.ts`
- All API handlers must call `requireAuth(req)` from `api/lib/auth.ts` before touching data
- `apiFetch<T>()` in `src/lib/api.ts` auto-converts request bodies to `snake_case` and responses to `camelCase`
- Immutable state updates — always spread or use new objects, never mutate in place

## Testing

Tests live next to source files (`*.test.ts`). The testing stack is:
- **Vitest** — test runner
- **jsdom** — DOM environment
- **@testing-library/react** — component testing
- **@testing-library/user-event** — user interaction simulation

```bash
npm test                 # single run
npm run test:watch       # watch mode during development
npm run test:coverage    # coverage report
```

Target: **80% coverage** on all new code. Write tests before implementation (TDD).

## PR Checklist

- [ ] `npm run lint` passes with no type errors
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (target: 80% coverage)
- [ ] New API routes call `requireAuth(req)` and use `parseBody(Schema, req.body)`
- [ ] New API PATCH/GET handlers distinguish 404 (`PGRST116`) from 500 errors
- [ ] All data-modifying queries filter by `user_id` (ownership check)
- [ ] Non-fatal operations return composite responses (e.g., `{ data, operationFailed }`) and client handles warnings
- [ ] No hardcoded strings that belong in `src/constants/branding.ts`
- [ ] No direct Supabase calls from browser code (all data access goes through `/api/*`)
- [ ] New `apiFetch` call sites specify a type parameter (`apiFetch<MyType>(...)`) when the response shape is known
- [ ] No `any` types introduced in new code without a comment explaining why
- [ ] Related documentation updated: CLAUDE.md, docs/CODEMAPS/ROUTES.md, or docs/RUNBOOK.md
