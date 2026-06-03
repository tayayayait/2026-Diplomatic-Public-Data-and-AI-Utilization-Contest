# DiploLife Design System

Last reviewed: 2026-05-29

This document records the Phase 1 design-system baseline applied from `상세서.md`.

## Applied Scope

- Replaced SafeRoute semantic color values in `src/styles.css` with DiploLife CSS custom properties.
- Added `--dl-color-*` tokens for primary, accent, danger, success, surface, text, and border colors.
- Added dark-mode token overrides for DiploLife.
- Mapped existing Tailwind semantic variables such as `--primary`, `--background`, `--border`, and `--danger` to DiploLife tokens so existing components can migrate gradually.
- Updated shared `Button`, `Card`, `Input`, and `Badge` primitives to match the Phase 1 component foundation.
- Removed mobile viewport zoom blocking from the root route metadata.

## Token Source

The canonical source is still `상세서.md`. The implementation source is:

- `src/styles.css`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/badge.tsx`
- `src/routes/__root.tsx`

## Required Verification

- `src/lib/diplolife/design-system.test.ts` verifies the implemented color tokens, semantic variable mapping, dark-mode overrides, viewport zoom rule, and shared primitive sizing.
- Full `npm test` remains required after any code change.

## Out Of Scope For Phase 1

- Replacing SafeRoute routes with DiploLife routes.
- Rebuilding AppShell navigation.
- Replacing `Trip` state with DiploLife state.
- Updating every existing SafeRoute screen to visually match the final DiploLife layout.

Those items start in later phases.
