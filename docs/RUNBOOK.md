# Runbook — Savare Operations & Troubleshooting

**Last Updated:** 2026-04-05

This runbook covers common operational tasks, debugging tips, and troubleshooting procedures for the Savare logistics platform.

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Common Development Tasks](#common-development-tasks)
3. [API Debugging](#api-debugging)
4. [Frontend Debugging](#frontend-debugging)
5. [Database Operations](#database-operations)
6. [Testing & Quality](#testing--quality)
7. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Initial Setup

```bash
# Clone the repo
git clone <repo-url>
cd Savare-AI

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Fill in .env.local with your Supabase credentials
# - VITE_SUPABASE_URL (get from Supabase Settings > API)
# - VITE_SUPABASE_ANON_KEY (get from Supabase Settings > API)
# - SUPABASE_URL (server-side, same URL)
# - SUPABASE_SERVICE_ROLE_KEY (get from Supabase Settings > API > Service Role Key)
# - FRONTEND_URL (leave as https://your-app.vercel.app in production)
```

### Running Locally

**Option 1: Run in two terminal windows**

Terminal 1 — Express API Server (port 3001):
```bash
npm run dev:server
```

Terminal 2 — Vite Frontend (port 3000):
```bash
npm run dev
```

**Option 2: Run both in one terminal**

```bash
npm run dev:full
```

Visit http://localhost:3000. Vite automatically proxies `/api/*` to the Express server.

### Supabase Schema Setup

Before running the app, create tables and RPC functions in Supabase SQL Editor:

1. Go to [supabase.com](https://supabase.com) → your project → SQL Editor
2. Copy the schema from [README.md → Database Migrations](../README.md#2-run-database-migrations)
3. Paste into SQL Editor and run

Required tables:
- `users` — User profiles (separate from Supabase Auth)
- `orders` — Orders (parent of shipments)
- `shipments` — Shipments/trips (one per container)
- `vehicles` — Vehicle fleet
- `drivers` — Driver roster
- `expenses` — Trip expenses
- `lrs` — Lorry Receipts
- `counters` — Atomic counter state

Required RPC functions:
- `get_next_counter(p_user_id, p_type, p_fiscal_year)` — Atomic order/trip number generation
- `get_next_lr_number(p_user_id, p_fiscal_year)` — Atomic LR sequence generation

---

## Common Development Tasks

### Adding a New API Route

**File structure:**
```
api/
├── lib/
│   ├── auth.ts          (requireAuth, user validation)
│   ├── supabase.ts      (initialized client)
│   └── validate.ts      (parseBody, ApiError class)
└── <feature>/
    └── index.ts or [id].ts   (handler function)
```

**Template (api/orders/[id].ts):**
```typescript
import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const UpdateOrderSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'completed']).optional(),
});

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);
    const id = req.params.id;

    if (req.method === 'PATCH') {
      const updates = parseBody(UpdateOrderSchema, req.body);
      const { data, error } = await supabase
        .from('orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new ApiError(404, 'Order not found');
        throw error;
      }
      return res.json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

**Checklist:**
- [ ] Call `requireAuth(req)` at the start
- [ ] Use `parseBody(Schema, req.body)` for validation
- [ ] Throw `ApiError(status, message)` for user-facing errors
- [ ] Always filter queries by `user_id` (ownership check)
- [ ] Handle Postgres error code `PGRST116` as 404
- [ ] Include `updated_at: new Date().toISOString()` in update calls

### Adding a New Frontend Page

**File structure:**
```
src/
├── pages/
│   └── MyPage.tsx          (page component using DataContext)
├── components/
│   └── mypage/
│       ├── MyPageModal.tsx (modal sub-component)
│       └── MyPageTable.tsx (table sub-component)
└── types.ts               (shared types)
```

**Pattern for data fetching (use DataContext, not custom hooks):**
```typescript
import { useData } from '../contexts/DataContext';
import { useToast } from '../contexts/ToastContext';

export default function MyPage() {
  const { shipments, orders, loading, error, refetch } = useData();
  const { showToast } = useToast();

  // Data is automatically polled every 30 seconds from DataContext
  // Call refetch() to force an immediate update if needed

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {shipments.map((s) => (
        <div key={s.id}>{s.tripId}</div>
      ))}
    </div>
  );
}
```

**Key points:**
- Use `useData()` hook from `DataContext` (single source of truth)
- Do NOT create per-page custom fetch hooks
- Call `refetch()` if you need immediate refresh after a mutation
- DataContext handles 30-second polling automatically
- Errors are shown as toasts; no extra error handling needed

---

## API Debugging

### Check API Server Status

```bash
# Should return 200 with "OK" if the server is running
curl -X GET http://localhost:3001/api/health

# Or check any protected route with a JWT
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer <your-jwt>"
```

### View API Logs

Express logs go to **stdout**. Check your Terminal 1 (the one running `npm start`) for:
- Request method, path, status code
- `console.error()` output from handlers
- Supabase error messages

### Test an API Endpoint

Use `curl` or Postman:

```bash
# Get current user profile
curl -X GET http://localhost:3001/api/users/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiI..." \
  -H "Content-Type: application/json"

# Create an order
curl -X POST http://localhost:3001/api/orders \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "billingPartyName": "ABC Corp",
    "origin": "Mumbai",
    "destination": "Delhi",
    "containerSize": "20 ft",
    "containerCount": 2,
    "movementType": "Import"
  }'
```

### Shipment Update with Vehicle Swap

**Request:**
```bash
curl -X PATCH http://localhost:3001/api/shipments/:id \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "new-vehicle-uuid",
    "vehicleNumber": "KA-01-AB-1234",
    "previousVehicleId": "old-vehicle-uuid",
    "status": "in-transit"
  }'
```

**Response (200):**
```json
{
  "data": { "id": "...", "vehicleId": "new-...", "status": "in-transit", ... },
  "vehicleUpdateFailed": false
}
```

If `vehicleUpdateFailed` is `true`, the shipment was updated but vehicle availability changes didn't persist — warn the user to refresh.

---

## Frontend Debugging

### React Developer Tools

1. Install [React DevTools](https://react-devtools-tutorial.vercel.app/) browser extension
2. Open DevTools → Components tab
3. Inspect component props and state

### Check Console Logs

Open browser DevTools (F12) → Console tab:
- Errors from API calls
- `console.log()` output from components
- Network tab shows all `/api/*` requests

### Test Frontend with Demo Mode

1. Visit http://localhost:3000
2. Click "Continue as Guest"
3. This creates a temporary demo user in Supabase (rate-limited 5/IP/hr)
4. You're logged in and can browse the app

### Verify JWT Token

Your JWT is stored in Supabase Auth. To inspect it:

```javascript
// In browser console:
const session = await supabase.auth.getSession();
console.log(session.data.session.access_token);

// Decode at jwt.io to verify claims (sub, exp, role, etc.)
```

---

## Database Operations

### Query Supabase Directly

Go to Supabase Dashboard → SQL Editor → New Query:

```sql
-- List all orders for a user
SELECT * FROM orders WHERE user_id = 'user-uuid' ORDER BY created_at DESC;

-- Get shipment with vehicle details
SELECT s.*, v.plate_number, v.is_available FROM shipments s
LEFT JOIN vehicles v ON s.vehicle_id = v.id
WHERE s.id = 'shipment-uuid';

-- Check atomic counter state
SELECT * FROM counters WHERE user_id = 'user-uuid';
```

### Reset Demo Data

Demo data accumulates in Supabase. To clean up:

```sql
-- Delete all demo user data
DELETE FROM users WHERE is_demo = true;

-- Delete all data for a specific user
DELETE FROM users WHERE id = 'user-uuid'; -- cascades to all related records
```

### Test Atomic Counters

```sql
-- Manually call the RPC function
SELECT get_next_counter('user-uuid'::uuid, 'order', '25-26');
-- Returns: next_number (e.g., 5)

-- Subsequent calls increment:
SELECT get_next_counter('user-uuid'::uuid, 'order', '25-26');
-- Returns: 6
```

---

## Testing & Quality

### Run Tests

```bash
npm test                   # Run all tests once
npm run test:watch        # Watch mode during development
npm run test:coverage     # Coverage report (target: 80%)
```

### Write a Unit Test

**File:** `src/utils/cn.test.ts`
```typescript
import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn utility', () => {
  it('merges Tailwind classes correctly', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4'); // px-4 overrides px-2
  });
});
```

### Type Check

```bash
npm run lint   # tsc --noEmit (no output, just check)
```

---

## Troubleshooting

### Issue: "CORS error" when API calls fail

**Cause:** The Express server isn't running or is on the wrong port.

**Fix:**
1. Check Terminal 1 is still running `npm start` (default port 3001)
2. Verify `.env.local` has the right `VITE_API_BASE_URL` (empty for local dev)
3. Restart both servers and clear browser cache (Cmd+Shift+R)

### Issue: "Supabase Auth session not found"

**Cause:** Browser can't reach Supabase or credentials are wrong.

**Fix:**
1. Verify `.env.local` has correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
2. Check Supabase project is active (not deleted)
3. Clear browser localStorage: DevTools → Application → Local Storage → delete all

### Issue: "User profile not found" after signup

**Cause:** Signup created an auth user but `POST /api/users/register` failed to create the profile row.

**Fix:**
1. Check server logs (Terminal 1) for errors
2. Manually create the profile row in Supabase:
```sql
INSERT INTO users (auth_id, email, role, company_name, gstin, pan, address)
VALUES ('auth-uuid', 'user@example.com', 'Transporter', 'My Co', '27AAAA0000A1Z5', 'AAAPA5055K', 'Mumbai');
```

### Issue: "LR generation fails with 400"

**Cause:** Shipment is not in 'delivered' status.

**Fix:**
1. Go to Shipments page
2. Mark the shipment as "Delivered" (updates `status = 'delivered'`)
3. Try LR generation again from LR Management page

### Issue: "Vehicle not marked as unavailable" after trip assignment

**Cause:** Vehicle update failed (non-fatal). The shipment was updated but the vehicle state wasn't.

**Fix:**
1. Check the toast message for "Vehicle availability could not be refreshed"
2. Manually update the vehicle in the UI or DB:
```sql
UPDATE vehicles SET is_available = false WHERE id = 'vehicle-uuid';
```

### Issue: "Cannot call /api/shipments/:id with vehicleUpdateFailed"

**Cause:** You're using an older frontend code that doesn't handle the new response format.

**Fix:**
1. Restart the frontend: `npm run dev`
2. Clear browser cache and hard-refresh (Cmd+Shift+R)
3. Check you're on the latest main branch

---

## Environment Variables Checklist

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `VITE_SUPABASE_URL` | Yes | `https://abc123.supabase.co` | Browser bundle (public) |
| `VITE_SUPABASE_ANON_KEY` | Yes | `eyJhbGc...` | Browser bundle (public) |
| `VITE_API_BASE_URL` | Local: No, Prod: Yes | `https://app.railway.app` | Leave empty for local dev (Vite proxy) |
| `SUPABASE_URL` | Yes | `https://abc123.supabase.co` | Server-side only |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | `eyJhbGc...` | Server-side only (never expose) |
| `FRONTEND_URL` | Local: No, Prod: Yes | `https://app.vercel.app` | CORS origin on Express |

---

## Key Code Locations

| Component | File | Purpose |
|-----------|------|---------|
| API fetch wrapper | `src/lib/api.ts` | Auto snake_case/camelCase conversion, JWT attachment |
| Auth guard | `src/App.tsx` | Route protection via `useUser()` hook |
| User state | `src/hooks/useUser.ts` | Singleton pattern for auth state; `refreshProfile()` export |
| Data context | `src/contexts/DataContext.tsx` | Shared polling for all entities; 30-second interval |
| API validation | `api/lib/validate.ts` | Zod schemas, error handling |
| API auth | `api/lib/auth.ts` | `requireAuth(req)` JWT validation |
| Supabase client | `api/lib/supabase.ts` | Initialized with service role key |
| Report generation | `src/utils/reportGenerator.ts` | Excel/PDF exports; `buildLRDocument()` exported |
| LR bulk download | `src/utils/lrBulkDownload.ts` | Zip generation for multiple LRs (uses jszip) |
| Fiscal year logic | `src/lib/fiscalYear.ts` | Indian FY (April–March) utilities |
| Vehicle detail modal | `src/components/vehicles/VehicleDetailModal.tsx` | Compliance tracking, shipment history, expense summary |

---

## Quick Reference: Recent Changes (2026-04-05)

### DataContext
- Single shared polling context for all entities (shipments, vehicles, drivers, orders, expenses, lrs)
- Polls every 30 seconds; prevents concurrent fetches with ref guard
- Replaced per-page custom fetch hooks
- Call `useData()` to access; `refetch()` for immediate refresh

### useUser singleton
- Module-level cache with listener pattern
- Call `refreshProfile()` after registration to clear `needsProfile` flag
- Shared across all hook calls; avoids duplicate subscriptions

### VehicleDetailModal
- New reusable component for vehicle compliance tracking
- Shows assigned driver, compliance dates (insurance, permit, fitness, PUC)
- Displays recent shipments and expenses by vehicle
- Calculates lifetime expense total; badges show expiry warnings

### lrBulkDownload utility
- New utility `src/utils/lrBulkDownload.ts`
- Generates ZIP of multiple LR PDFs using jszip
- Uses `buildLRDocument()` extracted from reportGenerator

### buildLRDocument extracted
- `src/utils/reportGenerator.ts` now exports `buildLRDocument(shipment, order, vehicle)`
- Reusable for both single LR and bulk ZIP generation

### dev:server and dev:full scripts
- `npm run dev:server` — Express in watch mode (tsx watch)
- `npm run dev:full` — Frontend + server in parallel

### jszip added to dependencies
- Explicit dependency for LR bulk download functionality

---

For more details, see:
- [CLAUDE.md](../CLAUDE.md) — Architecture overview
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Code style & testing
- [docs/CODEMAPS/ROUTES.md](./CODEMAPS/ROUTES.md) — API endpoint details
- [docs/CODEMAPS/DATABASE.md](./CODEMAPS/DATABASE.md) — Database schema
