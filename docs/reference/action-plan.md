# Legacy SafeRoute Action Plan

This document describes the legacy SafeRoute deterministic consumer action plan. It is retained as an engine reference only.

The active DiploLife Phase 5 dashboard work is documented in `docs/reference/diplolife-dashboard-presenter.md`.

## Scope

The action plan combines only data that the app has already verified or explicitly marked as fallback:

- Public-data travel alarm, visa, and embassy contact fields
- Open-Meteo weather-risk status
- Google Places or Google Maps search fallback links
- Incomplete required checklist items

It does not ask Gemini to invent new local risks. Missing data simply produces no action item.

## Behavior

The dashboard renders up to five ordered actions:

1. Official travel alarm review
2. Weather-driven schedule or packing action
3. First required incomplete checklist item
4. Local hospital/police/place-save action
5. Embassy emergency contact save action

Each action includes a source label and, when useful, a link to the relevant app route or map search.

## Files

- `src/lib/saferoute/travel-action-plan.ts`
- `src/components/saferoute/TravelActionPlanPanel.tsx`
