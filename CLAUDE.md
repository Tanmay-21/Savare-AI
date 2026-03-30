# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server on port 3000
npm run build        # Production build (outputs to dist/)
npm run lint         # Type-check with tsc --noEmit
npm run preview      # Preview production build
npm run clean        # Remove dist/
npm test             # Run unit tests (vitest)
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report (target: 80%)
```

Environment: copy `.env.local.example` to `.env.local` and fill in Supabase credentials.

## Architecture Overview

**Sava₹e** is a logistics management SPA for Indian transporters and CHA (Custom House Agents).

### Stack

- **Frontend**: React + Vite + TypeScript, deployed as a static SPA
- **Auth**: Supabase Auth (`src/supabase.ts` — anon key, browser-safe)
- **API layer**: Vercel Serverless Functions in `api/` (TypeScript, `@vercel/node`)
- **Database**: Supabase PostgreSQL — all data access goes through `/api/*` routes, never directly from the browser

### Key architectural decisions

- **No direct DB access from browser**: The browser authenticates via Supabase Auth and calls `/api/*` with a Bearer JWT. Serverless handlers use the service role key to query Supabase.
- **`apiFetch`**: `src/lib/api.ts` — wraps `fetch`, attaches the Supabase session JWT, auto-converts request bodies to `snake_case` and response JSON to `camelCase`.
- **User state**: `useUser` hook (`src/hooks/useUser.ts`) fetches user profile via `GET /api/users/me`. `App.tsx` uses `supabase.auth.onAuthStateChange` for route-level guarding — both must stay in sync.
- **Polling**: 30-second `setInterval` replaces real-time Firestore `onSnapshot` listeners (MVP approach).
- **Atomic counters**: PostgreSQL RPC functions `get_next_counter(name, user_id)` and `get_next_lr_number(user_id)` generate order numbers, trip IDs, and LR numbers atomically.
- **Fiscal year**: Indian fiscal year (April–March), format `YY-YY` (e.g., `25-26`). Logic in `src/lib/fiscalYear.ts`.

### API routes (`api/`)

| Route | Methods | Purpose |
|---|---|---|
| `api/users/me.ts` | GET, PATCH | Current user profile |
| `api/users/register.ts` | POST | Create user profile after auth signup |
| `api/auth/demo.ts` | POST | Create demo user + return JWT |
| `api/orders/index.ts` | GET, POST | List / create orders |
| `api/orders/[id].ts` | GET, PATCH, DELETE | Single order |
| `api/shipments/index.ts` | GET, POST | List / create shipments |
| `api/shipments/[id].ts` | GET, PATCH, DELETE | Single shipment |
| `api/vehicles/index.ts` | GET, POST | List / create vehicles |
| `api/vehicles/[id].ts` | GET, PATCH, DELETE | Single vehicle |
| `api/drivers/index.ts` | GET, POST | List / create drivers |
| `api/drivers/[id].ts` | GET, PATCH, DELETE | Single driver |
| `api/expenses/index.ts` | GET, POST | List / create expenses |
| `api/expenses/[id].ts` | GET, PATCH, DELETE | Single expense |
| `api/lrs/index.ts` | GET | List LRs |
| `api/lrs/generate.ts` | POST | Generate LR (atomic sequence) |
| `api/counters/next.ts` | POST | Get next counter value |

### Supabase tables

| Table | Key columns | Notes |
|---|---|---|
| `users` | `auth_id`, `role`, `company_name`, `gstin`, `pan`, `is_verified` | Role: `'CHA'`, `'Transporter'`, `'admin'` |
| `orders` | `order_number`, `billing_party_name`, `movement_type`, `container_count`, `status` | Parent of shipments |
| `shipments` | `trip_id`, `order_id`, `container_number`, `status`, `lr_number` | One per container |
| `vehicles` | `plate_number`, `vehicle_type`, `status`, expiry date columns | Tracks compliance |
| `drivers` | `name`, `license_number`, `status`, payment fields | |
| `expenses` | `trip_id`, `category`, `amount`, `payment_method`, `status` | 8 fixed categories |
| `lrs` | `lr_number`, `shipment_id`, `fiscal_year`, `sequence_number` | Lorry Receipts |
| `counters` | `name`, `user_id`, `last_number` | Used by `get_next_counter` RPC |

### Routing

All authenticated app routes live under `/app/*` inside `<Layout>`. Public routes: `/` (Landing), `/login`, `/legal`.

### Report generation

`src/utils/reportGenerator.ts` generates Excel (ExcelJS) and PDF (jsPDF + autotable) reports. Browser-only.

### Styling

Tailwind CSS v4 via `@tailwindcss/vite` plugin. Use `cn()` from `src/utils/cn.ts` (clsx + tailwind-merge). Animations use Framer Motion.

### Branding

App name and logo URL are centralized in `src/constants/branding.ts`. Use `APP_NAME`, never hardcoded strings.

### Testing

Vitest + jsdom + Testing Library. Tests live next to their source files (`*.test.ts`). Run `npm test`. Coverage target: 80%.
