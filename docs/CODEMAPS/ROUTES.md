# Codemap: Routes & Navigation

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
| `/api/shipments/:id` | GET, PATCH, DELETE | `api/shipments/[id].ts` | Single shipment |
| `/api/vehicles` | GET, POST | `api/vehicles/index.ts` | List / create vehicle |
| `/api/vehicles/:id` | GET, PATCH, DELETE | `api/vehicles/[id].ts` | Single vehicle |
| `/api/drivers` | GET, POST | `api/drivers/index.ts` | List / create driver |
| `/api/drivers/:id` | GET, PATCH, DELETE | `api/drivers/[id].ts` | Single driver |
| `/api/expenses` | GET, POST | `api/expenses/index.ts` | List / create expense |
| `/api/expenses/:id` | GET, PATCH, DELETE | `api/expenses/[id].ts` | Single expense |
| `/api/lrs` | GET | `api/lrs/index.ts` | List LRs |
| `/api/lrs/generate` | POST | `api/lrs/generate.ts` | Generate LR with atomic sequence |
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
