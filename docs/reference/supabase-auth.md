# Supabase Auth

Last reviewed: 2026-06-03

This document records the current Supabase-based authentication boundary for DiploLife.

## Applied Scope

- Added `src/lib/auth.ts` as the single wrapper around Supabase Auth calls.
- Added `src/lib/auth-context.tsx` to load the persisted Supabase session, subscribe to auth state changes, and expose `signIn`, `signUp`, and `signOut`.
- Added `src/components/auth/AuthGate.tsx` to redirect anonymous users to `/auth`.
- Added `/auth` with email/password login and signup modes.
- Updated S0 landing CTAs to enter `/auth` with a safe local `redirectTo` target.
- Updated `/settings` logout to call `supabase.auth.signOut()` through the auth context.
- Configured `src/lib/supabase.ts` so session persistence, URL session detection, and token refresh run only in the browser. Server-side Supabase usage keeps session persistence disabled.

## Runtime Behavior

- On app load, `AuthProvider` calls `supabase.auth.getSession()` and listens to `supabase.auth.onAuthStateChange`.
- Anonymous access to `AppShell` screens redirects to `/auth?redirectTo=<current-route>`.
- `/onboarding` is also protected by `AuthGate` because onboarding creates account-scoped profile state.
- Login uses `supabase.auth.signInWithPassword`.
- Signup uses `supabase.auth.signUp` with optional `display_name` metadata and an email confirmation redirect back to `/auth`.
- Logout clears the Supabase session and navigates to `/`.

## Constraints

- Supabase project email-confirmation settings determine whether signup immediately returns a session. If confirmation is enabled, the UI reports that email verification is required.
- User profile persistence remains local-only. Authenticated `user_profiles` storage, RLS policy design, and profile sync are not implemented in this change.
- Password reset, OAuth providers, MFA, account deletion, and server-side cookie auth are not implemented.

## Verification

- `src/lib/auth.test.ts` covers the Supabase Auth wrapper contract.
- `src/lib/auth-route.test.ts` covers the `/auth` route, auth gate, landing links, and settings logout integration.
- `npm run build` verifies the generated TanStack route tree includes `/auth`.
