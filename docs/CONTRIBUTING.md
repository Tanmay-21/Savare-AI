# Contributing Guide

## Prerequisites

- Node.js 18+
- Vercel CLI: `npm install -g vercel`
- A Supabase project (free tier is sufficient for development)

## Setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase credentials (see README)
vercel link                         # one-time: connect repo to Vercel project
vercel dev                          # http://localhost:3000 — runs Vite + API functions
```

> `npm run dev` starts the Vite frontend only (port 3000). API calls to `/api/*` will return 404 unless you use `vercel dev`.

For Supabase schema setup (tables, RPC functions), see the SQL migrations in the [README](../README.md#2-run-database-migrations).

## Available Scripts

<!-- AUTO-GENERATED -->
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 (frontend only — no API functions) |
| `npm run build` | Production build, outputs to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | TypeScript type-check only (`tsc --noEmit`) |
| `npm run clean` | Delete `dist/` |
| `npm test` | Run unit tests with Vitest |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Coverage report (target: 80%) |
<!-- AUTO-GENERATED -->

## Environment Variables

<!-- AUTO-GENERATED -->
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL — embedded in browser bundle (safe, anon access only) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key — embedded in browser bundle |
| `SUPABASE_URL` | Yes | Supabase project URL — used by Vercel API functions (server-side only) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — server-only, **never expose to browser** |
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
- [ ] `npm test` passes
- [ ] New API routes call `requireAuth(req)` and use `parseBody(Schema, req.body)`
- [ ] New API PATCH/GET handlers distinguish 404 (`PGRST116`) from 500 errors
- [ ] No hardcoded strings that belong in `src/constants/branding.ts`
- [ ] No direct Supabase calls from browser code (all data access goes through `/api/*`)
- [ ] New `apiFetch` call sites specify a type parameter (`apiFetch<MyType>(...)`) when the response shape is known
- [ ] No `any` types introduced in new code without a comment explaining why
