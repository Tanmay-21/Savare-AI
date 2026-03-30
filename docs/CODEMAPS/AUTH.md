# Codemap: Authentication & User State

## Auth Modes

### 1. Email/Password Auth (Production)

Flow:
1. `/login` — user selects role (`Transporter`; CHA shows "Coming Soon")
2. **Login**: `supabase.auth.signInWithPassword({ email, password })` → Supabase validates → session JWT issued → `onAuthStateChange` fires → `apiFetch('/api/users/me')` fetches profile → user state set
3. **Signup**: `supabase.auth.signUp({ email, password })` → then `apiFetch('/api/users/register', { method: 'POST', body: profileData })` creates the profile row → same onAuthStateChange flow

### 2. Demo Mode (Guest Access)

Flow:
1. User clicks "Continue as Guest" on `/login`
2. Browser calls `POST /api/auth/demo` (no auth required)
3. Server creates a real Supabase Auth user with a random `demo_*.savare.app` email and a random UUID password
4. Server inserts a `users` profile row (`is_demo: true`, `is_verified: true`)
5. Server returns `{ access_token, refresh_token }`
6. Browser calls `supabase.auth.setSession({ access_token, refresh_token })`
7. `onAuthStateChange` fires → normal auth flow continues

Demo sessions are **rate-limited** (5 per IP per hour) in `api/auth/demo.ts`.

## Single Source of Truth: `useUser()`

All auth state lives in `src/hooks/useUser.ts`. `App.tsx` consumes it via `const { user, loading } = useUser()` — there is no duplicate state.

```typescript
// useUser.ts flow:
supabase.auth.getSession()        // check for existing session on mount
  → apiFetch<AppUser>('/api/users/me')   // fetch profile
  → setUser({ ...session.user, ...profile })

supabase.auth.onAuthStateChange()  // react to login / logout
  → same profile fetch on login
  → setUser(null) on logout
```

## AppUser Type

The runtime user object is typed as `AppUser` (defined in `src/hooks/useUser.ts`):

```typescript
interface AppUser {
  // From Supabase profile row (camelCase via apiFetch)
  id: string;             // database primary key UUID
  authId: string;         // Supabase Auth user UUID (= auth.users.id)
  email: string;
  role: 'CHA' | 'Transporter' | 'admin';
  companyName: string;
  phoneNumber: string | null;
  gstin: string;          // always stored uppercase
  pan: string;            // always stored uppercase
  address: string;
  chaLicenseNumber: string | null;
  transportLicenseNumber: string | null;
  fleetSize: '1-10' | '11-50' | '50+' | null;
  isVerified: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;

  // Runtime-only flag (not in DB)
  needsProfile?: boolean; // true when JWT exists but profile row doesn't (mid-signup)
}
```

## Route Guards (App.tsx)

```
/ (Landing)      → if user && !needsProfile → /app
/login           → if user && !needsProfile → /app
/app/*           → if !user || needsProfile → /login
```

"Authenticated" means: `user !== null && !user.needsProfile`

## Server-Side Auth: requireAuth()

Every API handler calls `requireAuth(req)` from `api/lib/auth.ts`:

```typescript
async function requireAuth(req): Promise<AuthUser> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new ApiError(401, 'Unauthorized');

  // Verify JWT with Supabase
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) throw new ApiError(401, 'Unauthorized');

  // Fetch profile row
  const { data: profile } = await supabase.from('users').select('*').eq('auth_id', user.id).single();
  if (!profile) throw new ApiError(404, 'PROFILE_NOT_FOUND');

  return profile as AuthUser;
}
```

`apiFetch()` automatically attaches the current Supabase session JWT as a `Bearer` token in every request.

## Supabase Auth Configuration

| Setting | Local dev | Production |
|---------|-----------|------------|
| Site URL | `http://localhost:3000` | `https://your-app.vercel.app` |
| Redirect URLs | `http://localhost:3000/**` | `https://your-app.vercel.app/**` |
| Email confirmation | Optional (disable for fast dev) | Recommended |

## Security Boundary

```
Browser
  ├─ VITE_SUPABASE_ANON_KEY  → can call Supabase Auth only
  └─ Bearer JWT               → sent to /api/* on every request

Server (api/)
  └─ SUPABASE_SERVICE_ROLE_KEY → full DB access, bypasses RLS
```

The browser **never** uses the service role key. All data mutations go through the API layer which validates the JWT first.
