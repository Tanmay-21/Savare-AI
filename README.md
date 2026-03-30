# Sava₹e — Logistics Management for Indian Transporters

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

A full-stack logistics SPA for Indian fleet owners and Custom House Agents (CHA). Manage orders, shipments, vehicles, drivers, lorry receipts (LRs), and expenses — with Excel and PDF report exports.

**Stack:** React 19 + Vite (frontend, Vercel) · Express on Railway (API) · Supabase Auth + PostgreSQL (data)

---

## Local Development

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime |
| Supabase account | — | Auth + database |
| Railway account | — | API server hosting (production only) |

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a region close to your users
3. Note your **Project URL** and **API keys** (Settings → API)

### 2. Run database migrations

In the Supabase **SQL Editor**, run the schema to create all tables and RPC functions:

```sql
-- Users table (profile data, separate from Supabase Auth)
create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('CHA','Transporter','admin')),
  company_name text not null,
  phone_number text,
  gstin text not null,
  pan text not null,
  address text not null,
  cha_license_number text,
  transport_license_number text,
  fleet_size text check (fleet_size in ('1-10','11-50','50+')),
  is_verified boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders table
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  order_number text not null,
  billing_party_name text not null,
  consignee_name text,
  is_billing_same_as_consignee boolean not null default true,
  origin text not null,
  destination text not null,
  container_size text not null check (container_size in ('20 ft','40 ft')),
  movement_type text not null check (movement_type in ('Import','Export','Rail')),
  is_lolo boolean not null default false,
  yard_selection text,
  container_count integer not null check (container_count > 0),
  remarks text,
  status text not null default 'pending' check (status in ('pending','in-progress','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shipments table (one row per container)
create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  trip_id text not null,
  container_number text not null default '',
  container_size text check (container_size in ('20 ft','40 ft')),
  origin text not null,
  destination text not null,
  status text not null default 'pending' check (status in ('pending','in-transit','delivered','cancelled')),
  vehicle_id uuid,
  vehicle_number text,
  driver_id uuid,
  driver_name text,
  lr_number text,
  seal_number text,
  is_locked boolean default false,
  is_lolo boolean default false,
  yard_selection text,
  movement_type text check (movement_type in ('Import','Export','Rail')),
  billing_party_name text,
  consignee_name text,
  is_billing_same_as_consignee boolean,
  estimated_arrival timestamptz,
  actual_arrival timestamptz,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vehicles table
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  plate_number text not null,
  vehicle_type text not null,
  status text not null default 'active' check (status in ('active','maintenance','inactive')),
  is_available boolean default true,
  current_driver_id uuid,
  insurance_expiry date,
  permit_expiry date,
  fitness_expiry date,
  puc_expiry date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Drivers table
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  phone text,
  license_number text not null,
  status text not null default 'available' check (status in ('available','on-trip','off-duty')),
  current_vehicle_id uuid,
  current_vehicle_number text,
  bank_account text,
  ifsc text,
  upi_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Expenses table
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  trip_id text,
  vehicle_id uuid,
  vehicle_number text,
  driver_id uuid,
  driver_name text,
  category text not null check (category in ('Fuel','Toll','Maintenance','Driver Allowance','Loading/Unloading','Permit/Tax','Weighment Charges','Other')),
  amount numeric not null check (amount >= 0),
  date date not null,
  payment_method text not null check (payment_method in ('cash','online')),
  status text not null default 'pending' check (status in ('pending','paid')),
  payment_remark text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- LRs (Lorry Receipts) table
create table public.lrs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  lr_number text not null,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  fiscal_year text not null,
  sequence_number integer not null,
  created_at timestamptz not null default now()
);

-- Counters table (atomic sequence generation)
create table public.counters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  last_number integer not null default 0,
  fiscal_year text not null,
  unique (name, user_id, fiscal_year)
);

-- RPC: get_next_counter (order numbers, trip IDs)
create or replace function get_next_counter(
  p_user_id uuid,
  p_type text,
  p_fiscal_year text
) returns integer language plpgsql security definer as $$
declare
  v_next integer;
begin
  insert into public.counters (name, user_id, last_number, fiscal_year)
    values (p_type, p_user_id, 1, p_fiscal_year)
  on conflict (name, user_id, fiscal_year) do update
    set last_number = counters.last_number + 1
  returning last_number into v_next;
  return v_next;
end;
$$;

-- RPC: get_next_lr_number (LR sequence per fiscal year)
create or replace function get_next_lr_number(
  p_user_id uuid,
  p_fiscal_year text
) returns integer language plpgsql security definer as $$
declare
  v_next integer;
begin
  insert into public.counters (name, user_id, last_number, fiscal_year)
    values ('lr', p_user_id, 1, p_fiscal_year)
  on conflict (name, user_id, fiscal_year) do update
    set last_number = counters.last_number + 1
  returning last_number into v_next;
  return v_next;
end;
$$;
```

### 3. Enable Supabase Auth

In your Supabase project:
- **Authentication → Providers** → ensure **Email** is enabled
- (Optional) **Authentication → Email Templates** → customise confirmation emails
- **Authentication → URL Configuration** → set **Site URL** to `http://localhost:3000` for local dev

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your values:

```
# Supabase — browser-safe (embedded in the React bundle)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# Supabase — server-only (never expose to the browser)
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Leave empty in local dev — Vite proxies /api/* to localhost:3001 automatically
VITE_API_BASE_URL=
```

**Where to find these values:**

| Variable | Location in Supabase |
|----------|----------------------|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | Project → Settings → API → **Project URL** |
| `VITE_SUPABASE_ANON_KEY` | Project → Settings → API → **Project API keys** → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project → Settings → API → **Project API keys** → `service_role secret` |

> **Security:** `VITE_*` variables are embedded in the browser bundle — only the **anon key** belongs there. The **service role key** bypasses Row Level Security and must never go in a `VITE_` variable.

### 5. Start the dev servers

The API runs as a standalone Express server on port 3001. Vite proxies all `/api/*` requests to it automatically — no extra config needed.

Open two terminal tabs:

```bash
# Terminal 1 — Express API server (port 3001)
npm start

# Terminal 2 — Vite frontend (port 3000)
npm run dev
```

Visit `http://localhost:3000`. API calls go through Vite's proxy to Express.

---

## Production Deployment

The app splits into two services:
- **Frontend** → Vercel (static SPA, free)
- **API** → Railway (Express server, free hobby tier)

### 1. Push to GitHub

```bash
git remote add origin https://github.com/<your-org>/<your-repo>.git
git push -u origin main
```

### 2. Deploy the API to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repository
3. Railway auto-detects Node.js. Set the **Start Command** to:
   ```
   npm start
   ```
4. In **Variables**, add:

   | Variable | Value |
   |----------|-------|
   | `SUPABASE_URL` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase `service_role` secret key |
   | `FRONTEND_URL` | Your Vercel app URL (e.g. `https://your-app.vercel.app`) — used for CORS |

5. After deploy, go to **Settings → Networking** → **Generate Domain** to get a public URL like `https://your-app.up.railway.app`

### 3. Deploy the frontend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select your repo
2. Framework preset: **Vite** (auto-detected)
3. Leave **Build Command** and **Output Directory** at defaults (`vite build` / `dist`)
4. In **Environment Variables**, add:

   | Variable | Value |
   |----------|-------|
   | `VITE_SUPABASE_URL` | Your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase `anon` public key |
   | `VITE_API_BASE_URL` | Your Railway URL, e.g. `https://your-app.up.railway.app` |

5. Click **Deploy**

### 4. Update Supabase Auth URLs for production

In Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: add `https://your-app.vercel.app/**`

### 5. Redeploy Vercel with the Railway URL

After Railway gives you a domain (step 2.5), go back to your Vercel project → **Settings → Environment Variables** → update `VITE_API_BASE_URL` with the Railway URL, then redeploy.

Every subsequent push to `main` deploys both services automatically.

---

## Available Commands

<!-- AUTO-GENERATED -->
| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Start Express API server (uses `$PORT`, defaults to 3001) |
| `npm run dev` | Start Vite frontend on port 3000 (proxies `/api/*` to port 3001) |
| `npm run build` | Production build of the frontend, outputs to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | TypeScript type-check (`tsc --noEmit`) |
| `npm run clean` | Delete `dist/` |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:coverage` | Coverage report (target: 80%) |
<!-- AUTO-GENERATED -->

---

## Environment Variables

<!-- AUTO-GENERATED -->
| Variable | Required | Where | Description |
|----------|----------|-------|-------------|
| `VITE_SUPABASE_URL` | Yes | Browser | Supabase project URL (safe for client) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Browser | Supabase anonymous/public key (safe for client) |
| `VITE_API_BASE_URL` | Yes (prod) | Browser | Railway API URL — leave empty in local dev |
| `SUPABASE_URL` | Yes | Server only | Supabase project URL (for the Express API) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only | Supabase service role key — **never expose to browser** |
| `FRONTEND_URL` | Yes (prod) | Server only | Vercel app URL — used for CORS on the Railway server |
<!-- AUTO-GENERATED -->

---

## Project Structure

```
├── api/                    # Express route handlers (Node.js / TypeScript)
│   ├── lib/
│   │   ├── auth.ts         # requireAuth() — JWT validation + profile fetch
│   │   ├── supabase.ts     # Server-side Supabase client (service role)
│   │   └── validate.ts     # Zod-based request body parsing
│   ├── auth/demo.ts        # POST /api/auth/demo — guest demo session
│   ├── users/              # GET+PATCH /api/users/me, POST /api/users/register
│   ├── orders/             # CRUD /api/orders + /api/orders/:id
│   ├── shipments/          # CRUD /api/shipments + /api/shipments/:id
│   ├── vehicles/           # CRUD /api/vehicles + /api/vehicles/:id
│   ├── drivers/            # CRUD /api/drivers + /api/drivers/:id
│   ├── expenses/           # CRUD /api/expenses + /api/expenses/:id
│   ├── lrs/                # GET /api/lrs, POST /api/lrs/generate
│   └── counters/next.ts    # POST /api/counters/next
│
├── server.ts               # Express entry point — mounts all routes, CORS, JSON parsing
│
├── src/                    # React SPA (Vite)
│   ├── App.tsx             # Route guards — uses useUser() hook
│   ├── supabase.ts         # Browser Supabase client (anon key)
│   ├── hooks/useUser.ts    # Single source of truth for auth state
│   ├── lib/api.ts          # apiFetch<T>() — JWT-authed fetch with case conversion
│   ├── lib/fiscalYear.ts   # Indian fiscal year (April–March) helpers
│   ├── pages/              # Feature pages (Dashboard, Orders, Shipments, …)
│   ├── components/         # Layout, ComingSoonModal
│   ├── types.ts            # Shared TypeScript interfaces
│   ├── constants/branding.ts # APP_NAME, APP_LOGO_URL
│   └── utils/
│       ├── cn.ts           # clsx + tailwind-merge helper
│       └── reportGenerator.ts # Excel + PDF report exports (browser-only)
│
├── docs/
│   ├── CONTRIBUTING.md
│   └── CODEMAPS/           # Architecture reference maps
│
├── .env.local.example      # Environment variable template
├── vercel.json             # Vercel config (SPA fallback rewrite)
└── vite.config.ts          # Vite build config + /api proxy for local dev
```
