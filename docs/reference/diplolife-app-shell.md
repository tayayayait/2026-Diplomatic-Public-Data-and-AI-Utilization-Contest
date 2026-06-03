# DiploLife AppShell

Last reviewed: 2026-06-03

Phase 3 adds the shared DiploLife shell required by `상세서.md`.

## Applied Scope

- Added `src/components/diplolife/AppShell.tsx`.
- Wrapped authenticated DiploLife routes S1-S9 with AppShell.
- Kept S0 `/` landing outside AppShell.
- Added desktop fixed top navigation for `/dashboard`, `/chat`, `/itinerary`, `/sos`, and `/cost`.
- Added desktop icon links for settings/profile.
- Added mobile top bar with notification and menu controls.
- Added mobile bottom tab bar for home, AI, itinerary, cost, and profile.
- Added global floating SOS button.
- Centralized the `#main-content` landmark in AppShell for S1-S9.
- Wrapped AppShell content with `AuthGate` so anonymous users are redirected to `/auth` before protected screens render.

## Route Coverage

The following routes now use AppShell:

- `/dashboard`
- `/chat`
- `/itinerary`
- `/sos`
- `/cost`
- `/settings`
- `/safety`
- `/visa`
- `/notices`

`/onboarding` is outside AppShell but is protected by `AuthGate`.

## Verification

- `src/lib/diplolife/app-shell.test.ts` checks AppShell source structure and authenticated-route wrapping.
- `src/lib/auth-route.test.ts` checks AppShell AuthGate integration and onboarding protection.
- `tests/e2e/diplolife-routes.spec.ts` checks route rendering plus desktop and mobile shell navigation.

## Out Of Scope For Phase 3

- Real notification drawer behavior.
- Mobile menu bottom sheet behavior.
- Persistent user profile state.
- Data-backed dashboard cards.

Those items belong to later phases.
