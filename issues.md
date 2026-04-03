# Code Review Issues

Generated from code review of error surfacing system implementation.

---

## HIGH (fix before merge)

- [x] **[H1] Auto-complete orders effect silently swallows errors** — `src/pages/Orders.tsx:91`
  The `.catch(err => console.error(...))` in the background PATCH loop has no user-facing toast. Add `showToast(parseApiError(error), 'error')`.

- [x] **[H2] Hardcoded fetch-error messages should use `parseApiError`** — `src/pages/Dashboard.tsx`, `src/pages/Drivers.tsx`, `src/pages/Vehicles.tsx`, `src/pages/Expenses.tsx`, `src/pages/LRManagement.tsx`, `src/pages/Shipments.tsx`
  Fetch error catch blocks say "Failed to load X" regardless of actual cause. A 401 session expiry shows the wrong message. Replace hardcoded strings with `parseApiError(error)`.

- [x] **[H3] `userData` typed as `any` in Settings** — `src/pages/Settings.tsx:13`
  Use `AppUser` from `src/hooks/useUser.ts` instead of `any`. Also added `website?: string` to the `AppUser` interface.

- [x] **[H4] Settings edit form allows GSTIN/PAN to be saved without client-side format validation** — `src/pages/Settings.tsx`
  The register flow validates these via regex; the settings edit form does not. Add `GSTIN_REGEX` / `PAN_REGEX` checks with `<FieldError>` before the PATCH call.

- [x] **[H5] `useEffect` dependency arrays are empty while closures capture `showToast` and refs** — all 8 page files
  Will fail `eslint-plugin-react-hooks` exhaustive-deps. Since `showToast` is a stable reference this is low-risk at runtime, but violates lint rules. Add captured stable refs to deps arrays.

- [x] **[H6] `Expenses.tsx` and `Shipments.tsx` exceed the 800-line file size limit**
  These files contain fetch logic, business logic, multiple modal forms, and report download utilities in a single component. Extract modals and data hooks into separate files.

- [x] **[H7] No `fetchData()` call in `generateBulkLRs` catch block** — `src/pages/LRManagement.tsx:90-95`
  If request 3 of 10 fails, requests 1-2 already succeeded but the UI does not refresh to show partial progress. Add `await fetchData()` in the catch block.

- [x] **[H8] `Authorization: Bearer undefined` sent when session is null** — `src/lib/api.ts:61`
  `Bearer ${session?.access_token}` produces the literal string `"Bearer undefined"` when session is null. Guard: `...(session?.access_token ? { Authorization: \`Bearer ${session.access_token}\` } : {})`.

---

## MEDIUM

- [x] **[M1] `ToastContainer` missing `aria-live` on the container element** — `src/components/ui/ToastContainer.tsx:13`
  The container has `aria-label="Notifications"` but lacks `role="log"` and `aria-live="polite"`. Individual toasts have `role="alert"` but Framer Motion mounts them after page load, which some screen readers miss. Add a persistent live region on the container.

- [x] **[M2] `toggleOrderExpansion` / `toggleOrderSelection` mutate a Set before calling setState** — `src/pages/Orders.tsx:189-207`
  Use the functional updater form to avoid stale closure risk.

- [x] **[M3] Auto-delivery transition on expense save is a silent side-effect** — `src/pages/Expenses.tsx:147-156`
  When a new expense is saved for an `in-transit` trip, the trip is auto-marked `delivered` with no user notification. Add a toast: "Trip automatically marked as delivered." Also handle the case where the PATCH to the shipment fails after expenses are already saved.

- [x] **[M4] Missing tests for `FieldError` component** — `src/components/ui/FieldError.tsx`
  All other new utilities have tests. Add a test verifying the component renders an error message and is absent when `message` is undefined.

- [x] **[M5] `success` state in Settings is redundant now that toast notifications are wired** — `src/pages/Settings.tsx:17,63-64`
  Remove the `success` state, the inline "Saved Successfully" badge, and the `setTimeout(() => setSuccess(false), 3000)` call. The success toast is sufficient.

---

## LOW

- [x] **[L1] `key?: React.Key` in `ToastProps` is not a real prop** — `src/components/ui/Toast.tsx:28`
  `key` is a React-internal reserved attribute and should never appear in a component's props interface. Remove the field from `ToastProps`.

- [x] **[L2] Placeholder contact details hardcoded in Dashboard** — `src/pages/Dashboard.tsx:201`
  `support@savare.com` and `+91 98765 43210` are hardcoded. Move to `src/constants/branding.ts` alongside `APP_NAME`.

- [x] **[L3] `PGRST116` check in `auth.ts` lacks explanatory comment** — `api/lib/auth.ts:37`
  Add a comment: `// PGRST116 = PostgREST "no rows returned" — user has auth account but no profile row`.
