# DiploLife Dashboard Presenter

Last reviewed: 2026-05-29

Phase 5 implements the S2 dashboard display model from `상세서.md`.

## Applied Scope

- Added `src/lib/diplolife/dashboard.ts`.
- Added profile-derived dashboard seed generation for visa D-day and non-Gemini AI recommendation text.
- Moved dashboard card ordering and status-aware display text out of the React route.
- Connected `/dashboard` to `createDashboardViewModel`.
- Updated onboarding completion so `completeOnboarding` seeds D-day and the first dashboard recommendation.

## Dashboard Order

Cards are emitted in the order required by `상세서.md`:

1. 안전지수
2. 비자 D-day
3. 환율
4. 날씨
5. 공지
6. AI 추천

Dismissed AI recommendations are omitted instead of rendering stale advice.

## Data Boundary

Phase 5 does not invent public-data values. Safety, exchange, weather, and notices still show their current state until a verified data source writes into the store.

The only derived values are from user profile input:

- `visaDday`
- onboarding recommendation text

## Verification

- `src/lib/diplolife/dashboard.test.ts` checks D-day derivation, card order, status-aware values, and dismissed recommendation behavior.
- `src/lib/diplolife/dashboard-route-integration.test.ts` checks that `/dashboard` uses the presenter.

## Out Of Scope For Phase 5

- Real public-data hydration.
- Gemini response generation.
- Dismiss button behavior.
- Push notifications.
- Offline cache.
