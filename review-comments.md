# Code Review — Sava₹e

**Reviewed:** 2026-03-30
**Scope:** Full codebase (`api/`, `src/lib/`, `src/hooks/`, `src/pages/`, `src/utils/`)

---

## CRITICAL

### 1. Duplicate auth/user-state logic in `App.tsx` and `useUser.ts`
**Files:** `src/App.tsx:28-54`, `src/hooks/useUser.ts:9-34`

`App.tsx` re-implements the exact session-load + `apiFetch('/api/users/me')` flow that `useUser.ts` already encapsulates. Two separate React states (`App.user` and `useUser.user`) now track the same thing. The app uses `App.user` for route guards and passes it as a prop to `<Layout>`, while Dashboard and other pages call `useUser()` independently. Any divergence between them (e.g. after a PATCH to `/api/users/me`) will cause inconsistent renders.

**Fix:** Route guards in `App.tsx` should consume the `useUser()` hook rather than duplicating the logic.

---

### 2. Demo endpoint has no rate limiting
**File:** `api/auth/demo.ts:6`

`POST /api/auth/demo` creates a real Supabase auth user + profile row on every call. There is no IP-based rate limiting, request quota, or captcha. A single client can spam this endpoint to exhaust Supabase's auth-users quota or flood the `users` table.

**Fix:** Add a rate-limit header check (Vercel `x-vercel-forwarded-for`) or Vercel Edge Middleware before this handler is reached.

---

### 3. Silent failure when linking LR back to shipment
**File:** `api/lrs/generate.ts:48-52`

```ts
// Update shipment with lr_number
await supabase
  .from('shipments')
  .update({ lr_number: lrNumber, updated_at: ... })
  .eq('id', shipment_id)
  .eq('user_id', user.id);
```

The `.update()` result is discarded. If it fails (e.g., `shipment_id` doesn't belong to this user, or a DB error), an LR record is created but the shipment never gets `lr_number`. The API returns `201` as if everything succeeded.

**Fix:** Destructure `{ error }` from the update and `throw` if present, or wrap both operations in a Postgres transaction via RPC.

---

### 4. Dead Firebase code leaks PII in thrown errors
**Files:** `src/utils/errorHandlers.ts:38`, `src/firebase.ts`

`handleFirestoreError` is a leftover from the Firebase era and is not used anywhere in the Supabase codebase. More critically, `handleApiError` (line 22-35) throws `new Error(JSON.stringify(errInfo))` where `errInfo` includes `userId` and `email`. If this error reaches an `alert()` or a generic catch block that renders the message, it leaks PII.

**Fix:** Remove `src/firebase.ts` and `handleFirestoreError` entirely. Sanitise `handleApiError` to exclude auth info from the thrown error message (keep it only in `console.error`).

---

## HIGH

### 5. `apiFetch` return type is `Promise<any>` — no type safety at call sites
**File:** `src/lib/api.ts:40`

All 15+ call sites receive `any`, which means type errors in response handling are silent. The entire chain from API response → component state is untyped.

**Fix:** Add a generic `apiFetch<T>(...)` signature so callers can specify `apiFetch<Order[]>(...)` and get typed results.

---

### 6. `user` state typed as `any` throughout
**Files:** `src/App.tsx:25`, `src/hooks/useUser.ts:6`

The user object merged from `session.user` + profile data is `any`. Page components access `user?.companyName`, `user?.role`, etc. with no compile-time guarantee these fields exist.

**Fix:** Create an `AppUser` type (intersection of `AuthUser` from `api/lib/auth.ts` with Supabase's `User` type) and use it in `useUser`.

---

### 7. PATCH error handler conflates 404 and 500
**Files:** `api/orders/[id].ts:41`, `api/shipments/[id].ts:49`

```ts
if (error) throw new ApiError(404, 'Order not found');
```

Any Supabase error (network timeout, constraint violation, RLS rejection) is mapped to a `404`. A genuine server error will appear as "Order not found" to the client, masking the real cause.

**Fix:** Distinguish between "no rows returned" (genuine 404) and other Supabase errors (500). Check `error.code` or row count to differentiate.

---

### 8. `forEach async` in `useEffect` — fire-and-forget with no error feedback
**File:** `src/pages/Orders.tsx:86-96`

```ts
pendingUpdates.forEach(async (order) => {
  try {
    await apiFetch(...)
  } catch (error) {
    console.error(...)
  }
});
```

`forEach` does not await promises — each PATCH fires independently with no central completion tracking. On a 30-second polling cycle, this effect re-runs and re-fires the same PATCHes for any orders that failed on the previous cycle (or are still in-flight). There's no UI feedback if auto-completion fails.

**Fix:** Use `Promise.all` and track completion status, or optimistically set local state and reconcile on the next fetch.

---

### 9. Dashboard chart uses hardcoded static data
**File:** `src/pages/Dashboard.tsx:12-20`

```ts
const CHART_DATA = [
  { day: 'Mon', trips: 12 },
  { day: 'Tue', trips: 19 },
  ...
];
```

The bar chart is labeled "Weekly performance metrics" and the stat cards display a "Real-time" badge, but the chart data is static placeholder data unrelated to the user's actual shipments.

**Fix:** Derive the weekly chart data from the `trips` array fetched in `fetchDashboard`, grouping by day-of-week for the current week.

---

### 10. Hardcoded fleet status values in Dashboard
**File:** `src/pages/Dashboard.tsx:362-369`

The "Fleet Status" panel hardcodes `"85% Active"` and `count: 2` for maintenance vehicles. These are not derived from actual vehicle data fetched via `apiFetch('/api/vehicles')`.

**Fix:** Compute active/maintenance/idle counts from the `vehicles` array returned by the API (using `vehicle.status`).

---

### 11. CSV export in `downloadDailyReport` writes XLSX
**File:** `src/utils/reportGenerator.ts:141-145`

```ts
} else {
  const buffer = await workbook.xlsx.writeBuffer();  // ← xlsx, not csv
  saveAs(new Blob([buffer]), `Daily_Report_....xlsx`);  // ← .xlsx extension
}
```

The `csv` branch of `downloadDailyReport` calls `workbook.xlsx.writeBuffer()` and saves with `.xlsx`. The `format` parameter is silently ignored.

**Fix:** Call `workbook.csv.writeBuffer()` and save with `.csv` extension in the else branch.

---

## MEDIUM

### 12. No duplicate-registration guard on `POST /api/users/register`
**File:** `api/users/register.ts:31-41`

If a user retries signup (network timeout, double-click), two rows are inserted with the same `auth_id`. Supabase will likely enforce a unique constraint and return a 500, but the error message surfaced to the client is generic.

**Fix:** Use `.upsert({ ...body, auth_id: user.id }, { onConflict: 'auth_id' })` or check for an existing row first, returning 409 if found.

---

### 13. Counter incremented even when subsequent insert fails
**Files:** `api/orders/index.ts:41-57`, `api/shipments/index.ts:46-62`

`get_next_counter` is called and increments the counter. If the subsequent `.insert()` fails (validation, RLS, network), the counter has already been consumed and the sequence has a gap (e.g., ORD/25-26/003 never exists). This is a known trade-off but worth documenting.

**Recommendation:** Add a comment acknowledging intentional gap tolerance, or implement a compensating action (re-insert with the same sequence number via an upsert-on-conflict approach).

---

### 14. Wrong HTTP status for missing user profile
**File:** `api/lib/auth.ts:37`

```ts
if (profileError || !profile) throw new ApiError(401, 'Profile not found');
```

When a JWT is valid but no profile row exists (legitimate case: user signed up via Supabase Auth but hasn't completed registration), the API returns `401 Unauthorized`. The semantically correct status is `404` (or a custom `403` with a specific code). The frontend checks `needsProfile: true` but other API clients would misinterpret a 401 as "bad token".

**Fix:** Return `404` or `403` with a machine-readable code like `{ error: 'PROFILE_NOT_FOUND' }`.

---

### 15. `User` interface uses `uid` (Firebase naming), doesn't match API
**File:** `src/types.ts:2`

```ts
export interface User {
  uid: string;  // ← Firebase convention
  ...
}
```

The API and Supabase use `id` and `auth_id`. The `useUser.ts` merges `session.user` (which has `id`) with the profile object (which has `id` and `auth_id`). The `User` interface's `uid` field is never populated from a real API response — it's a stale Firebase artifact that can cause bugs if any code reads `user.uid`.

**Fix:** Replace `uid` with `id` and `authId` (camelCase of `auth_id`) to match the actual API response shape.

---

### 16. CHA signup form fields are unreachable dead code
**File:** `src/pages/Login.tsx:375-389`

When `selectedRole === 'CHA'`, the component renders a "Coming Soon" screen (line 217-251) and never reaches the auth form. The CHA-specific form fields (`cha_license_number`, the CHA license input) inside the form at line 375 are unreachable code.

**Fix:** Remove the CHA-specific form branch inside the Transporter form, or add a TODO comment noting it's reserved for when CHA onboarding ships.

---

### 17. `parseBody` validation errors expose internal field structure
**File:** `api/lib/validate.ts:13`

```ts
throw new ApiError(400, JSON.stringify(result.error.flatten()));
```

The raw Zod validation error (with field paths and messages) is sent to the client. While useful for development, in production this leaks internal schema details.

**Recommendation:** Log the full error server-side and return a simplified `{ error: 'Invalid request body', fields: { ... } }` to clients.

---

### 18. `expenses.filter(e => e.tripId === shipment.id || e.tripId === shipment.tripId)` — ambiguous ID match
**File:** `src/pages/Orders.tsx:218`

Expenses are filtered by matching `tripId` against both the shipment's database `id` (UUID) and its human-readable `tripId` (e.g., `TRP/25-26/001`). The `expenses` table uses `trip_id` which maps to the human-readable trip ID string (not the UUID), so the `=== shipment.id` branch always returns false.

**Fix:** Filter only by `e.tripId === shipment.tripId` to avoid the misleading and always-false UUID comparison.

---

## LOW

### 19. Non-null assertion on optional `createdAt` field
**File:** `src/pages/Dashboard.tsx:59`

```ts
trips.filter((t: Shipment) => new Date(t.createdAt!) >= firstDayOfMonth)
```

`createdAt` is typed as `string | undefined` in the `Shipment` interface. The `!` assertion suppresses the TypeScript error but will produce `Invalid Date` at runtime if the field is absent.

**Fix:** Guard with `t.createdAt && new Date(t.createdAt) >= firstDayOfMonth`.

---

### 20. No format validation for GSTIN and PAN
**Files:** `api/users/register.ts:9-10`, `api/lib/validate.ts`

```ts
gstin: z.string().min(1),
pan: z.string().min(1),
```

GSTIN is a 15-character alphanumeric format (`\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}`). PAN is 10 characters (`[A-Z]{5}[0-9]{4}[A-Z]{1}`). Accepting any non-empty string means malformed values are persisted.

**Fix:** Add `.regex()` validators to the Zod schemas.

---

### 21. `src/firebase.ts` — dead file from Firebase era
**File:** `src/firebase.ts`

The project has migrated to Supabase, but this file still exists in `src/`. It adds unnecessary bundle weight and creates confusion about what auth/DB layer is actually in use.

**Fix:** Delete `src/firebase.ts`.

---

### 22. Missing test coverage for API handlers and page components
**Files:** `api/orders/`, `api/shipments/`, `api/lrs/`, `src/pages/`

Tests exist for `fiscalYear.ts`, `api.ts`, and `validate.ts`, but there are no tests for:
- Any API handler (orders, shipments, vehicles, drivers, LRs, demo auth)
- Any React page component (Dashboard, Orders, Shipments, Login)

Current coverage is well below the 80% target stated in `CLAUDE.md`.

**Recommendation:** Add Vitest tests for API handlers using `@vercel/node` mocks, and React Testing Library tests for at minimum the Login and Orders components.

---

## Summary

| Severity | Count |
|---|---|
| Critical | 4 |
| High | 7 |
| Medium | 7 |
| Low | 4 |
| **Total** | **22** |

**Highest priority items to address before production:**
1. Rate-limit the demo endpoint (C-2)
2. Fix the LR-shipment link silent failure (C-3)
3. Consolidate user state into `useUser` hook (C-1)
4. Fix PATCH error conflation of 404/500 (H-7)
5. Remove `handleFirestoreError` and sanitise PII in error throws (C-4)
