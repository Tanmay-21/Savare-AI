# Implementation Plan: Supabase Backend + Vercel Deployment

## Requirements

Migrate Sava₹e from a direct-Firestore frontend to a secure, server-mediated architecture:

- **Database**: Supabase (PostgreSQL) replacing Cloud Firestore
- **Auth**: Supabase Auth replacing Firebase Auth
- **API layer**: Vercel Serverless Functions (`/api` directory) — all mutations routed through server
- **Frontend**: Vite React stays unchanged in technology; Firebase SDK removed
- **Security goal**: Browser never touches the database directly; service key never leaves the server
- **Deploy target**: Vercel (frontend + API functions as a single project)

---

## Current Architecture Problems

| Issue | Detail |
|---|---|
| No backend | All reads/writes go directly from browser to Firestore |
| Permissive rules | `firestore.rules` has `|| true` fallbacks on 6 collections — any user can write anything |
| Client-side counters | `getNextId()` and LR sequence use Firestore transactions from the browser — race conditions possible |
| No input validation layer | Validation only exists in Firestore rules (weak) — no server-side schema enforcement |
| Firebase config in repo | `firebase-applet-config.json` is committed — exposes project ID and API keys |

---

## Target Architecture

```
Browser (Vite React)
  │
  │  fetch('/api/...')  +  Authorization: Bearer <supabase_jwt>
  ▼
Vercel Serverless Functions  (/api/*.ts)
  │  validates JWT   │  runs Zod schema validation
  │
  │  supabase-js (service role key — server only)
  ▼
Supabase
  ├─ PostgreSQL  (8 tables + RLS as defense-in-depth)
  └─ Auth        (email/password, JWT issued to browser)
```

The browser holds only the **Supabase anon key** (used exclusively for Auth — signing in/up/out). It never makes direct database calls. All data access is through `/api/*` endpoints that validate the JWT and use the service key.

---

## Phase 1: Supabase Project & Schema

### 1.1 Create Supabase Project

- Create project at supabase.com
- Note: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Enable Email/Password provider in Auth settings
- Disable "Confirm email" for initial development (re-enable for production)

### 1.2 PostgreSQL Schema

Run the following migrations in Supabase SQL editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id       uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          text NOT NULL CHECK (role IN ('CHA', 'Transporter', 'admin')),
  company_name  text NOT NULL,
  phone_number  text,
  gstin         text NOT NULL,
  pan           text NOT NULL,
  address       text NOT NULL,
  cha_license_number     text,
  transport_license_number text,
  fleet_size    text CHECK (fleet_size IN ('1-10', '11-50', '50+')),
  is_verified   boolean NOT NULL DEFAULT false,
  is_demo       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      uuid NOT NULL REFERENCES users(id),
  order_number                 text NOT NULL,
  billing_party_name           text NOT NULL,
  consignee_name               text,
  is_billing_same_as_consignee boolean NOT NULL DEFAULT false,
  origin                       text NOT NULL,
  destination                  text NOT NULL,
  container_size               text NOT NULL CHECK (container_size IN ('20 ft', '40 ft')),
  movement_type                text NOT NULL CHECK (movement_type IN ('Import', 'Export', 'Rail')),
  is_lolo                      boolean NOT NULL DEFAULT false,
  yard_selection               text,
  container_count              integer NOT NULL CHECK (container_count > 0),
  remarks                      text,
  status                       text NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'in-progress', 'completed')),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id),
  plate_number     text NOT NULL,
  vehicle_type     text NOT NULL,
  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'maintenance', 'inactive')),
  is_available     boolean NOT NULL DEFAULT true,
  current_driver_id uuid,  -- FK added after drivers table created
  insurance_expiry date,
  permit_expiry    date,
  fitness_expiry   date,
  puc_expiry       date,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE drivers (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES users(id),
  name                   text NOT NULL,
  phone                  text,
  license_number         text NOT NULL,
  status                 text NOT NULL DEFAULT 'available'
                           CHECK (status IN ('available', 'on-trip', 'off-duty')),
  current_vehicle_id     uuid REFERENCES vehicles(id),
  current_vehicle_number text,
  bank_account           text,
  ifsc                   text,
  upi_id                 text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- Add deferred FK on vehicles
ALTER TABLE vehicles ADD CONSTRAINT vehicles_current_driver_id_fkey
  FOREIGN KEY (current_driver_id) REFERENCES drivers(id);

-- ============================================================
-- SHIPMENTS
-- ============================================================
CREATE TABLE shipments (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                      uuid NOT NULL REFERENCES users(id),
  order_id                     uuid REFERENCES orders(id),
  trip_id                      text NOT NULL,
  container_number             text,
  container_size               text CHECK (container_size IN ('20 ft', '40 ft')),
  origin                       text NOT NULL,
  destination                  text NOT NULL,
  status                       text NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'in-transit', 'delivered', 'cancelled')),
  vehicle_id                   uuid REFERENCES vehicles(id),
  vehicle_number               text,
  driver_id                    uuid REFERENCES drivers(id),
  driver_name                  text,
  lr_number                    text,
  movement_type                text CHECK (movement_type IN ('Import', 'Export', 'Rail')),
  is_lolo                      boolean,
  yard_selection               text,
  seal_number                  text,
  is_locked                    boolean NOT NULL DEFAULT false,
  billing_party_name           text,
  consignee_name               text,
  is_billing_same_as_consignee boolean,
  estimated_arrival            timestamptz,
  actual_arrival               timestamptz,
  remarks                      text,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE expenses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id),
  trip_id        text,
  shipment_id    uuid REFERENCES shipments(id),
  vehicle_id     uuid REFERENCES vehicles(id),
  vehicle_number text,
  driver_id      uuid REFERENCES drivers(id),
  driver_name    text,
  category       text NOT NULL
                   CHECK (category IN (
                     'Fuel', 'Toll', 'Maintenance', 'Driver Allowance',
                     'Loading/Unloading', 'Permit/Tax', 'Weighment Charges', 'Other'
                   )),
  amount         numeric(12,2) NOT NULL CHECK (amount >= 0),
  date           date NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'online')),
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'paid')),
  payment_remark text CHECK (char_length(payment_remark) <= 1000),
  description    text CHECK (char_length(description) <= 1000),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- LR SEQUENCES  (atomic counter per user per fiscal year)
-- ============================================================
CREATE TABLE lr_sequences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  fiscal_year text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, fiscal_year)
);

-- ============================================================
-- LRS (Lorry Receipts)
-- ============================================================
CREATE TABLE lrs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id),
  lr_number       text NOT NULL,
  shipment_id     uuid NOT NULL REFERENCES shipments(id),
  order_id        uuid REFERENCES orders(id),
  fiscal_year     text NOT NULL,
  sequence_number integer NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COUNTERS  (order/trip number sequences per user per fiscal year)
-- ============================================================
CREATE TABLE counters (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id),
  type        text NOT NULL CHECK (type IN ('order', 'trip')),
  fiscal_year text NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, type, fiscal_year)
);
```

### 1.3 Indexes

```sql
CREATE INDEX idx_orders_user_id     ON orders(user_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_shipments_user_id  ON shipments(user_id);
CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_trip_id  ON shipments(trip_id);
CREATE INDEX idx_expenses_user_id   ON expenses(user_id);
CREATE INDEX idx_expenses_trip_id   ON expenses(trip_id);
CREATE INDEX idx_lrs_user_id        ON lrs(user_id);
CREATE INDEX idx_lrs_shipment_id    ON lrs(shipment_id);
CREATE INDEX idx_vehicles_user_id   ON vehicles(user_id);
CREATE INDEX idx_drivers_user_id    ON drivers(user_id);
```

### 1.4 Row Level Security (Defense-in-Depth)

Even though the frontend doesn't call Supabase directly, RLS prevents any misconfiguration or future direct-client code from leaking data cross-user:

```sql
-- Enable RLS on all tables
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE lrs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE lr_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters    ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used in API functions only)
-- API reads/writes use service role — RLS is only enforced if client key used

-- Policies for users viewing own data (client-facing anon key, if ever used)
CREATE POLICY "users_own" ON users
  FOR ALL USING (auth_id = auth.uid());

CREATE POLICY "orders_own" ON orders
  FOR ALL USING (user_id = (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Repeat for all tables following same pattern
```

### 1.5 Atomic Counter Function

Replace the client-side Firestore transaction with a PostgreSQL function:

```sql
CREATE OR REPLACE FUNCTION get_next_counter(
  p_user_id   uuid,
  p_type      text,
  p_fiscal_year text
) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO counters (user_id, type, fiscal_year, last_number)
  VALUES (p_user_id, p_type, p_fiscal_year, 1)
  ON CONFLICT (user_id, type, fiscal_year)
  DO UPDATE SET last_number = counters.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN v_next;
END;
$$;

-- Same pattern for LR sequences
CREATE OR REPLACE FUNCTION get_next_lr_number(
  p_user_id     uuid,
  p_fiscal_year text
) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO lr_sequences (user_id, fiscal_year, last_number)
  VALUES (p_user_id, p_fiscal_year, 1)
  ON CONFLICT (user_id, fiscal_year)
  DO UPDATE SET last_number = lr_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN v_next;
END;
$$;
```

---

## Phase 2: Vercel API Layer

### 2.1 Project Structure

Add to the existing Vite project:

```
/api
  /lib
    supabase.ts        # server-only Supabase client (service key)
    auth.ts            # JWT validation middleware
    validate.ts        # Zod schema helpers
  /users
    me.ts              # GET, PATCH /api/users/me
  /orders
    index.ts           # GET /api/orders, POST /api/orders
    [id].ts            # GET, PATCH, DELETE /api/orders/:id
  /shipments
    index.ts           # GET /api/shipments, POST /api/shipments
    [id].ts            # GET, PATCH, DELETE /api/shipments/:id
  /vehicles
    index.ts           # GET /api/vehicles, POST /api/vehicles
    [id].ts            # GET, PATCH, DELETE /api/vehicles/:id
  /drivers
    index.ts           # GET /api/drivers, POST /api/drivers
    [id].ts            # GET, PATCH, DELETE /api/drivers/:id
  /expenses
    index.ts           # GET /api/expenses, POST /api/expenses
    [id].ts            # GET, PATCH, DELETE /api/expenses/:id
  /lrs
    index.ts           # GET /api/lrs
    generate.ts        # POST /api/lrs/generate  (atomic)
  /counters
    next.ts            # POST /api/counters/next  (atomic)
  /auth
    demo.ts            # POST /api/auth/demo      (create demo session)
```

### 2.2 Server-Side Supabase Client (`/api/lib/supabase.ts`)

```typescript
import { createClient } from '@supabase/supabase-js';

// This file is ONLY imported in /api/* — never in src/*
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service key: never expose to browser
);
```

### 2.3 Auth Middleware (`/api/lib/auth.ts`)

Every API handler calls this before touching data:

```typescript
import { supabase } from './supabase';
import type { VercelRequest } from '@vercel/node';

export async function requireAuth(req: VercelRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Unauthorized');

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');

  // Fetch internal user record
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (!profile) throw new Error('Profile not found');
  return profile;
}
```

### 2.4 Example API Handler (`/api/orders/index.ts`)

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';

const CreateOrderSchema = z.object({
  billingPartyName: z.string().min(1).max(200),
  consigneeName: z.string().optional(),
  isBillingSameAsConsignee: z.boolean(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  containerSize: z.enum(['20 ft', '40 ft']),
  movementType: z.enum(['Import', 'Export', 'Rail']),
  isLolo: z.boolean(),
  yardSelection: z.string().optional(),
  containerCount: z.number().int().positive(),
  remarks: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const parsed = CreateOrderSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      // Get atomic order number
      const { data: counterData } = await supabase
        .rpc('get_next_counter', {
          p_user_id: user.id,
          p_type: 'order',
          p_fiscal_year: getFiscalYear(),
        });

      const orderNumber = `ORD/${getFiscalYear()}/${String(counterData).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('orders')
        .insert({ ...parsed.data, user_id: user.id, order_number: orderNumber })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    if (err.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 2.5 Demo Session Endpoint (`/api/auth/demo.ts`)

Replace the `localStorage.demo_user_id` pattern with a real (but anonymous) Supabase auth session:

```typescript
// Creates a real Supabase anonymous auth user for demo sessions
// Returns a real JWT — all other API endpoints work identically
export default async function handler(req, res) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: `demo_${Date.now()}@demo.savare.app`,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { isDemo: true }
  });

  // Also sign them in to get a JWT
  const { data: session } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: data.user.email,
  });

  // Return a short-lived access token
  return res.json({ token: session.properties.access_token, userId: data.user.id });
}
```

> **Note**: Supabase supports Anonymous Sign-Ins natively. Prefer `supabase.auth.signInAnonymously()` from the client for simplicity — this gives a real JWT without custom endpoints.

### 2.6 Required Packages

```bash
npm install @supabase/supabase-js zod @vercel/node
npm install -D @types/vercel__node
```

### 2.7 `vercel.json`

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/**/*.ts": { "runtime": "@vercel/node" }
  }
}
```

---

## Phase 3: Auth Migration (Firebase → Supabase)

### Changes to `src/firebase.ts`

Remove Firebase entirely. Create `src/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

// Anon key is safe in browser — used ONLY for Auth (sign in/up/out)
// All data calls go through /api/* with the JWT
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### Changes to `src/App.tsx`

Replace `onAuthStateChanged` with `supabase.auth.onAuthStateChange`. Replace `onSnapshot(users/{uid})` with a fetch to `/api/users/me` after auth resolves.

### Changes to `src/hooks/useUser.ts`

Replace Firebase listeners with Supabase auth listener + API call.

### Changes to `src/pages/Login.tsx`

| Current | Replacement |
|---|---|
| `signInWithEmailAndPassword` | `supabase.auth.signInWithPassword` |
| `createUserWithEmailAndPassword` + `setDoc` | `supabase.auth.signUp` → triggers `POST /api/users/register` |
| `localStorage.demo_user_id` + reload | `supabase.auth.signInAnonymously()` (Supabase native) |
| `signOut(auth)` | `supabase.auth.signOut()` |

---

## Phase 4: Frontend Data Layer Migration

### Pattern Change

**Before** (every page):
```typescript
import { collection, onSnapshot, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

// In useEffect:
const unsub = onSnapshot(collection(db, 'orders'), (snap) => {
  setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});
```

**After**:
```typescript
import { apiFetch } from '../lib/api';  // thin wrapper around fetch + auth header

// In useEffect:
const data = await apiFetch('/api/orders');
setOrders(data);
```

### `src/lib/api.ts` (new file)

```typescript
import { supabase } from '../supabase';

export async function apiFetch(path: string, options?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

### Files to Modify

| File | Change |
|---|---|
| `src/firebase.ts` | Delete |
| `src/supabase.ts` | New: Supabase client (anon key only) |
| `src/lib/api.ts` | New: `apiFetch` helper |
| `src/hooks/useUser.ts` | Replace Firebase listeners |
| `src/utils/idGenerator.ts` | Replace with `POST /api/counters/next` |
| `src/utils/errorHandlers.ts` | Replace `auth.currentUser` with Supabase session |
| Every page in `src/pages/` | Replace `onSnapshot`/`addDoc`/`updateDoc`/`deleteDoc` with `apiFetch` |

### Real-Time Updates

`onSnapshot` gives live updates without polling. Options for replacement:

1. **Polling** (simplest): `setInterval(() => apiFetch('/api/orders').then(setOrders), 10000)`
2. **Supabase Realtime** (closest parity): `supabase.channel('orders').on('postgres_changes', ...)` — requires enabling Realtime on tables in Supabase dashboard and exposing channel through the anon key
3. **Recommendation**: Use polling (30s intervals) for MVP; add Supabase Realtime in a follow-up if live multi-device sync is important

---

## Phase 5: Environment Configuration

### Vercel Environment Variables

Set in Vercel project settings (not committed to repo):

| Variable | Scope | Description |
|---|---|---|
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Service key — API functions only |
| `VITE_SUPABASE_URL` | Client | Same URL, exposed to browser |
| `VITE_SUPABASE_ANON_KEY` | Client | Anon key — Auth only |
| `GEMINI_API_KEY` | Server | Move from client to server if Gemini calls are added |

### Remove from Repo

- `firebase-applet-config.json` — add to `.gitignore`, move values to env vars
- Remove Firebase dependencies from `package.json`

### `.env.local` (development)

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=...
```

---

## Phase 6: Vercel Deployment

### `package.json` Updates

```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  }
}
```

Vercel auto-detects Vite and runs `vite build`. API functions in `/api` are deployed as serverless functions automatically — no additional config needed beyond `vercel.json`.

### Deploy Steps

```bash
npm i -g vercel
vercel link          # link to Vercel project
vercel env pull      # pull env vars to .env.local
vercel dev           # local dev with API functions
vercel --prod        # production deploy
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| `onSnapshot` replacement breaks real-time UX | Medium | Use polling (30s) as drop-in, add Supabase Realtime later |
| LR / order number race conditions during migration | High | Migrate to PostgreSQL `get_next_counter()` function — atomic by design |
| Firebase Auth session tokens not portable | High | Users re-authenticate on first login after migration; expected one-time friction |
| Existing Firestore data loss | High | Run a migration script to export Firestore → seed Supabase before cutover |
| Demo mode UX change (no more localStorage magic) | Low | Supabase Anonymous Sign-In is seamless and produces a real JWT |
| `firebase-applet-config.json` committed to git | High | Rotate Firebase API keys immediately; move all secrets to env vars |

---

## Implementation Order

```
Phase 1  →  Supabase project + schema + SQL functions           (database foundation)
Phase 2  →  Vercel API functions + auth middleware              (server layer)
Phase 3  →  Auth migration in frontend                          (login/session)
Phase 4  →  Replace Firebase SDK calls page by page            (data layer)
Phase 5  →  Environment config + remove Firebase from repo     (cleanup)
Phase 6  →  Deploy to Vercel + smoke test all pages            (ship)
```

---

## Estimated Complexity

| Phase | Complexity | Notes |
|---|---|---|
| 1 — Schema | Low | Pure SQL, no code changes |
| 2 — API layer | High | ~16 endpoint files, Zod schemas for every type |
| 3 — Auth migration | Medium | 3 files: App.tsx, Login.tsx, useUser.ts |
| 4 — Data layer migration | High | Every page component + utility files |
| 5 — Env config | Low | Config only |
| 6 — Deploy | Low | Vercel auto-deploys on push |

---

**WAITING FOR CONFIRMATION**: Proceed with this implementation plan? Reply `yes` to begin, `modify: [changes]` to adjust scope, or `no` to cancel.
