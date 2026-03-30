# Codemap: Architecture Overview

## What is Sava₹e?

A logistics management SPA for Indian transporters (fleet owners) and CHA (Custom House Agents). It digitizes the trip lifecycle: orders → shipments → LRs (Lorry Receipts) → expenses → reports.

## Technology Stack

| Layer | Technology |
|---|---|
| UI | React 19, React Router v7, Framer Motion, Recharts |
| Styling | Tailwind CSS v4 (Vite plugin), lucide-react icons |
| State | React local state + 30-second polling (`setInterval`) |
| API | Vercel Serverless Functions (`api/` — TypeScript, `@vercel/node`) |
| Auth | Supabase Auth (email/password + anonymous demo sessions) |
| Database | Supabase PostgreSQL (accessed server-side via service role key) |
| Reports | ExcelJS (Excel/CSV), jsPDF + jspdf-autotable (PDF) |
| Build | Vite 6 |
| Hosting | Vercel (static SPA + serverless functions) |

## High-Level Data Flow

```
User Action
  └─> Page component (src/pages/)
        └─> apiFetch<T>() (src/lib/api.ts)
              └─> Vercel Serverless Function (api/)
                    ├─> requireAuth(req) — validates JWT via Supabase
                    └─> supabase (service role) → PostgreSQL
                          └─> JSON response → camelCase → React state → re-render
```

The browser **never** calls Supabase directly for data. All data access goes through `/api/*`. The browser only calls Supabase for **auth** (session management).

## Key Layers

### Entry Point

`src/main.tsx` → `src/App.tsx`

`App.tsx` manages top-level auth state and route guards via the `useUser()` hook. On mount, it checks for an existing Supabase session, fetches the user profile from `/api/users/me`, and listens for auth state changes.

### Authentication State — Single Source of Truth

`src/hooks/useUser.ts` is the **only** place that manages auth state. It:
1. Reads the Supabase session on mount
2. Fetches the user profile from `GET /api/users/me`
3. Merges `session.user` + profile into an `AppUser` object
4. Listens to `supabase.auth.onAuthStateChange` for login/logout events

`App.tsx` consumes `useUser()` directly — it does **not** duplicate the auth logic.

### Pages (src/pages/)

Each page is a self-contained feature module. Pages fetch their own data via `apiFetch()` on mount and on a 30-second interval. There is no shared data store.

| Page | API endpoints used | Notes |
|---|---|---|
| `Dashboard` | `/api/shipments`, `/api/orders`, `/api/vehicles`, `/api/drivers` | Aggregate counts; weekly trip chart derived from real data |
| `Orders` | `/api/orders`, `/api/shipments`, `/api/expenses` | Parent records; spawns shipments |
| `Shipments` | `/api/shipments`, `/api/vehicles`, `/api/drivers` | Linked to orders via `orderId` |
| `LRManagement` | `/api/lrs`, `/api/lrs/generate`, `/api/shipments` | Atomic LR sequence per fiscal year |
| `Vehicles` | `/api/vehicles` | Tracks compliance expiry dates |
| `Drivers` | `/api/drivers` | Linked to vehicles |
| `Expenses` | `/api/expenses`, `/api/shipments` | Linked to shipments via `tripId` |
| `Reports` | `/api/expenses`, `/api/shipments`, `/api/orders`, `/api/drivers`, `/api/vehicles` | Export only; no writes |
| `Settings` | `/api/users/me` | Reads/updates own user profile |
| `Login` | `/api/users/register`, `/api/auth/demo` | Creates profile on signup or demo session |

### Components (src/components/)

- `Layout` — sidebar nav, logout, role-based nav restrictions (CHA cannot access Vehicles/Drivers)
- `ComingSoonModal` — shown when CHA tries to access restricted nav items

### API Layer (api/)

All API handlers follow the same pattern:

```typescript
export default async function handler(req, res) {
  try {
    const user = await requireAuth(req);   // validates Bearer JWT, fetches profile
    const body = parseBody(Schema, req.body); // Zod validation; throws 400 on failure
    // ... business logic ...
    return res.json(data);
  } catch (err) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Utilities (src/utils/)

- `cn.ts` — `clsx` + `tailwind-merge` helper
- `idGenerator.ts` — fetches next counter value from `/api/counters/next`
- `errorHandlers.ts` — `handleApiError()` logs with context, throws sanitised message (no PII)
- `reportGenerator.ts` — Excel and PDF exports; browser-only (uses `document.createElement`)

## Role System

| Role | Access |
|---|---|
| `Transporter` | Full access to all nav items |
| `CHA` | Vehicles and Drivers nav items restricted (shows "Coming Soon") |
| `admin` | Full database access (server-side check in `requireAuth`) |

## Report Generation

`src/utils/reportGenerator.ts` exports:
- `downloadExpenseReport(expenses, trips, format)` — Excel (multi-sheet) or CSV
- `downloadDailyReport(shipments, orders, expenses, format)` — Excel or CSV
- `downloadAnnexureReport(shipments, orders, format)` — Excel or PDF
- `downloadVehiclePerformanceReport(shipments, vehicles)` — Excel
- `downloadPayoutReport(expenses, drivers)` — Excel
- `downloadLR(shipment, order, vehicle)` — PDF Lorry Receipt

All functions call internal `saveAs()` which creates a temporary `<a>` element — browser-only, no server round-trip.

## Atomic Counters

Order numbers (`ORD/25-26/001`), trip IDs (`TRP/25-26/001`), and LR numbers (`LR/25-26/0001`) are generated by PostgreSQL RPC functions:
- `get_next_counter(p_user_id, p_type, p_fiscal_year)` — for orders and trips
- `get_next_lr_number(p_user_id, p_fiscal_year)` — for LRs

Both use `INSERT ... ON CONFLICT DO UPDATE` to atomically increment and return the next value. Counter gaps can occur if the subsequent insert fails — this is intentional.
