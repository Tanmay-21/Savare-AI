# Codemap: Routes & Navigation

**Last Updated:** 2026-04-05

## Frontend Routes

| Path | Component | Auth Required | Notes |
|---|---|---|---|
| `/` | `Landing` | No | Redirects to `/app` if authenticated |
| `/login` | `Login` | No | Redirects to `/app` if authenticated |
| `/legal` | `Legal` | No | Static terms/privacy page |
| `/app` | `Dashboard` | Yes | Default app home |
| `/app/orders` | `Orders` | Yes | |
| `/app/vehicles` | `Vehicles` | Yes | Restricted for CHA role |
| `/app/drivers` | `Drivers` | Yes | Restricted for CHA role |
| `/app/shipments` | `Shipments` | Yes | |
| `/app/lrs` | `LRManagement` | Yes | |
| `/app/expenses` | `Expenses` | Yes | |
| `/app/reports` | `Reports` | Yes | Export-only, no writes |
| `/app/settings` | `Settings` | Yes | User profile & account |
| `/app/*` | — | Yes | Catch-all → `/app` |
| `/*` | — | No | Catch-all → `/` |

## API Routes

All API routes are Vercel Serverless Functions in `api/`. Requests are rewritten via `vercel.json`: `/api/(.*)` → `/api/$1`.

Every route (except `/api/auth/demo`) requires a `Authorization: Bearer <jwt>` header.

| Route | Methods | Handler | Notes |
|---|---|---|---|
| `/api/users/me` | GET, PATCH | `api/users/me.ts` | Current user profile |
| `/api/users/register` | POST | `api/users/register.ts` | Create profile after signup (upserts on conflict) |
| `/api/auth/demo` | POST | `api/auth/demo.ts` | Create anonymous demo user; rate-limited 5/IP/hr |
| `/api/orders` | GET, POST | `api/orders/index.ts` | List (owner-scoped) / create order |
| `/api/orders/:id` | GET, PATCH, DELETE | `api/orders/[id].ts` | Single order — 404 if not owned by caller |
| `/api/shipments` | GET, POST | `api/shipments/index.ts` | List / create shipment |
| `/api/shipments/:id` | GET, PATCH, DELETE | `api/shipments/[id].ts` | Single shipment; PATCH response: `{ data, vehicleUpdateFailed }` |
| `/api/vehicles` | GET, POST | `api/vehicles/index.ts` | List / create vehicle |
| `/api/vehicles/:id` | GET, PATCH, DELETE | `api/vehicles/[id].ts` | Single vehicle |
| `/api/drivers` | GET, POST | `api/drivers/index.ts` | List / create driver |
| `/api/drivers/:id` | GET, PATCH, DELETE | `api/drivers/[id].ts` | Single driver |
| `/api/expenses` | GET, POST | `api/expenses/index.ts` | List / create (single or batch); POST batch: `{ expenses: [...], lock_shipment_id? }` → `{ data, lockFailed }` |
| `/api/expenses/:id` | GET, PATCH, DELETE | `api/expenses/[id].ts` | Single expense |
| `/api/lrs` | GET | `api/lrs/index.ts` | List LRs |
| `/api/lrs/generate` | POST | `api/lrs/generate.ts` | Generate LR (requires `shipment.status === 'delivered'`); 400 if not delivered |
| `/api/counters/next` | POST | `api/counters/next.ts` | Get next counter value |

## Role-Based Navigation Restrictions

CHA users see all nav items, but Vehicles and Drivers are intercepted:
- `Layout.tsx` marks items with `restricted: true`
- Click → `setIsComingSoonOpen(true)` → `ComingSoonModal` shown
- Direct URL navigation (`/app/vehicles`) still loads — the page component itself does not enforce role restrictions (relies on nav-level UX)

Nav items with `restricted: true`: Vehicles (`/app/vehicles`), Drivers (`/app/drivers`)

## Auth Guard Logic (App.tsx)

`App.tsx` uses the `useUser()` hook — there is no duplicate auth state. The `/app/*` route guard:

```
user && !user.needsProfile  →  render <Layout> with child routes
otherwise                   →  <Navigate to="/login" />
```

`needsProfile` is `true` when a Supabase Auth session exists but no `users` profile row was found (mid-signup edge case, or a registered user who hasn't completed profile).

## Login Flow States

The `Login` page has three distinct UI states driven by `selectedRole`:

1. **Role selection** (`selectedRole === null`) — two role cards (CHA / Transporter) + "Continue as Guest" button
2. **CHA selected** — "Coming Soon" screen (CHA onboarding launches Q3 2026), back button shown
3. **Transporter selected** — email/password form with login/signup toggle

The signup form includes GSTIN and PAN fields (validated server-side with regex in `api/users/register.ts`). Fleet size is captured for Transporters.

## Layout

`Layout.tsx` renders the sidebar shell around all `/app/*` routes. The sidebar:
- Collapses to icon-only mode (toggleable)
- Highlights the active route by comparing `location.pathname` to each nav item's `path`
- Shows the company name from `user.companyName` (passed as prop from `App.tsx`)
- "Logout" button calls `supabase.auth.signOut()` which triggers `onAuthStateChange → null` → route guard redirects to `/login`

## Data Fetching Architecture

All entity data (shipments, vehicles, drivers, orders, expenses, lrs) is fetched through a single shared polling context:

**DataContext** (`src/contexts/DataContext.tsx`):
- Polls all 6 endpoints every 30 seconds
- Shared state accessed via `useData()` hook across all pages
- Prevents concurrent fetches with `fetchingRef` guard
- Shows error toast once per error cycle (with `errorShownRef`)
- Provides `refetch()` method for manual refresh after mutations

**Why:** Avoids duplicate per-page fetch logic, ensures data consistency across the app, reduces API load with batched polling.

## Recent API Changes (Updated 2026-04-05)

### PATCH /api/shipments/:id — Vehicle Update Atomicity

**Change:** PATCH response now returns `{ data, vehicleUpdateFailed }` instead of just `data`.

**Rationale:** Shipment updates and vehicle availability changes are now decoupled. The shipment is updated first (critical); vehicle state updates happen after as a best-effort operation. If vehicle updates fail, the shipment is already persisted correctly.

**Frontend handling** (`src/pages/Shipments.tsx` lines 149–151):
```typescript
if (result?.vehicleUpdateFailed) {
  showToast('Vehicle availability could not be refreshed — please check vehicle status.', 'error');
}
```

### PATCH /api/shipments/:id with `previousVehicleId`

**Change:** PATCH body now accepts optional `previousVehicleId` to handle vehicle swaps atomically on the server.

**Example request:**
```json
{
  "vehicleId": "new-vehicle-uuid",
  "vehicleNumber": "KA-01-AB-1234",
  "previousVehicleId": "old-vehicle-uuid",
  "status": "in-transit"
}
```

**Rationale:** When a user changes a vehicle mid-trip, the backend releases the old vehicle (`is_available: true`) and marks the new one as unavailable (`is_available: false`) in a single request.

### POST /api/lrs/generate — Shipment Status Guard

**Change:** LR generation now requires `shipment.status === 'delivered'`. Returns 400 if the shipment is in any other state.

**Error response (400):**
```json
{
  "error": "LR can only be generated for delivered shipments. Current status: in-transit"
}
```

**Frontend impact** (`src/pages/LRManagement.tsx` line 119):
- Pending tab now filters to `!s.lrNumber && s.status === 'delivered'`
- Only delivered shipments without LRs are shown as eligible for generation

### POST /api/expenses (Batch Mode)

**Change:** Expenses endpoint now supports batch insertion with optional shipment locking.

**Batch request body:**
```json
{
  "expenses": [
    { "tripId": "...", "category": "Fuel", "amount": 500, ... },
    { "tripId": "...", "category": "Toll", "amount": 100, ... }
  ],
  "lock_shipment_id": "..." // optional
}
```

**Batch response:** `{ data: [...], lockFailed: boolean }`

**Rationale:** When marking a shipment as delivered, the frontend sends multiple expenses + an optional request to lock the shipment atomically. If the lock fails (non-fatal), expenses are still persisted and the user is warned.

**Frontend impact** (`src/pages/Shipments.tsx` lines 167–200):
- When user marks a shipment "delivered" and enters expenses, a batch POST is sent with `lock_shipment_id`
- Handles `lockFailed` flag with a toast warning
