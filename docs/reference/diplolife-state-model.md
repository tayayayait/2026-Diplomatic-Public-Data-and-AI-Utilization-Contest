# DiploLife State Model

Last reviewed: 2026-06-03

Phase 4 introduces the DiploLife client state baseline from `상세서.md` section 9.

## Applied Scope

- Added `zustand` as the client state store dependency.
- Added `src/lib/diplolife/state.ts`.
- Added typed state boundaries for `UserProfile`, `StayCountry`, `DashboardState`, `ChatState`, SOS contacts, weather alerts, and cost insight.
- Added explicit loading states through `LoadingStatus`.
- Added dashboard action setters for safety score, visa D-day, exchange rate, notices, and AI recommendation.
- Added chat actions for input value, typing state, message append, and message status update.
- Added onboarding completion that derives the active `stayCountry` from the submitted profile.
- Added a `/settings` stay-profile action that routes back to `/onboarding` so users can choose a different country or city and replace the active profile.
- Profile, active stay country, cost insight, and the dashboard exchange-rate snapshot persist client-local through the Zustand `diplolife-storage` local storage entry.
- Cost insight uses a daily cache key based on country, city, stay purpose, stay dates, and total budget. It is reused on the same Asia/Seoul calendar day unless the user forces refresh.
- The itinerary screen reads `costInsight.totalBudgetKrw`, `costInsight.analysis.dailyBudget`, and the dashboard exchange-rate snapshot to derive a structured itinerary budget plan. `/cost` remains the living-cost analysis surface; `/itinerary` owns the final budget strategy used for route generation.
- Dashboard exchange-rate data is reused only for 10 minutes and within the selected destination's local calendar day. When either condition fails, the currency snapshot is treated as stale.
- The dashboard exchange-rate snapshot stores the current local-currency/KRW rate and the previous-day percentage move calculated from actual latest and previous daily exchange-rate points. If the previous daily point is unavailable, `changePercent` remains `null` instead of displaying a mock `0%`.
- Supabase Auth now provides authenticated sessions for protected routes. `user_profiles` load/sync calls remain intentionally disabled until authenticated profile storage and RLS policies are defined.

## Removed Boundary

The new store does not expose Trip-centered state:

- no `trip`
- no `trips`
- no travel checklist state
- no guardian share state

SafeRoute engine modules may still exist for later data reuse, but S1-S5 routes now depend on the DiploLife state model instead of Trip state.

## Route Integration

The following routes are connected to `useDiploLifeStore`:

- `/onboarding`
- `/dashboard`
- `/chat`
- `/sos`
- `/cost`

The remaining S6-S9 routes keep their Phase 2/3 static shells until their data contracts are implemented in later phases.

## Verification

- `src/lib/diplolife/state.test.ts` checks the state shape, onboarding derivation, dashboard setters, chat actions, daily cost-insight cache reuse, forced cost refresh, and destination-local exchange-rate cache expiry.
- `src/lib/diplolife/state-route-integration.test.ts` checks that S1-S5 import the DiploLife store and do not import Trip state.

## Out Of Scope For Phase 4

- Server persistence.
- Authenticated profile loading and profile sync.
- Unauthenticated Supabase writes to `user_profiles`.
- Real public-data hydration.
- AI response generation.
- Offline storage.
- S6-S9 data binding.
