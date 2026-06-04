# Gemini Contract

Phase 5 hardens Gemini usage around schema validation, evidence filtering, and fallback behavior.

## Extraction Contract

`extractItinerary` returns normalized structured data:

- `country_iso_alp2` is uppercased.
- Unsupported purpose and companion values become `unknown`.
- `confidence < 0.5` sets `low_confidence: true`.
- Non-string city values are discarded.

The confirmation screen remains the user correction point for low-confidence extraction.

## Briefing Contract

`generateBriefing` now validates and normalizes Gemini output through `gemini-contract.ts`.

Rules:

- `top_risks` must include `evidence_api` and `evidence_field`.
- `generateBriefing` sends Gemini an `available_evidence` list containing only successful API/field pairs with non-empty values.
- `top_risks` must cite an `available_evidence` `evidence_api`/`evidence_field` pair.
- Unknown API IDs are removed.
- Existing API IDs with nonexistent fields are removed.
- Checklist `evidence_api` is kept only when the API is present in public data.
- Gemini JSON parse failure is retried once.
- If Gemini fails or violates the schema, the server returns a public-data fallback briefing instead of failing the whole analysis.
- If Gemini returns a valid schema but every risk is removed by evidence filtering, the summary states evidence mismatch instead of schema failure.

## AI Itinerary Contract

`generateItineraryFn` parses Gemini output at the server boundary before returning it to the UI.

The itinerary prompt is built through `buildItineraryPrompt` so route-planning rules can be tested without calling Gemini. When both Gemini and Google Places keys are configured, Gemini output is treated as a planning draft, not as final factual place data. The server then calls `createGeminiGuidedGoogleItinerary` to match draft stops against Google Places Text Search and recompute route fields with Routes API before returning places.

Rules:

- Accommodation address is included in the prompt even when coordinates are not available.
- Accommodation coordinates are included only when both latitude and longitude are provided.
- The route prompt requires a cluster-based route, minimized backtracking, and travel-time estimation using `straight-line distance x 1.4` when exact route data is unavailable.
- Meal placement is based on the selected start time and itinerary intensity, not a fixed total-duration schedule. A relaxed 3-stop itinerary should include only 1 restaurant meal.
- The prompt includes an explicit target stop count from itinerary intensity: `relaxed` maps to 3 stops, `normal` maps to 5 stops, and `tight` maps to 7 stops. Gemini may return fewer only when route constraints make the target unrealistic.
- Multi-day generation may pass `dayIndex`, `tripDurationDays`, and `dayThemeHint`. The prompt tells Gemini to keep each day in a distinct area, theme, food category, and atmosphere when the itinerary is part of a longer trip.
- When previous place names are provided, the prompt explicitly forbids exact reuse and similar translated/localized/abbreviated aliases.
- Gemini must return a JSON array.
- Each place must satisfy `ItineraryPlaceSchema`.
- Timeline estimate fields are required for route ordering and food-stop rendering: `order`, `startTime`, `endTime`, `travelFromPrevMinutes`, `travelFromPrevDistance`, and `mealSlot`. Restaurant stops use the generic `meal` value instead of breakfast/lunch/dinner labels, while cafe stops use `snack`. Place cards do not expose expected arrival/departure as user-facing facts.
- Category may be `attraction`, `restaurant`, `cafe`, `shopping`, `nature`, `culture`, or `accommodation`.
- `recommendationContext` is optional. Google-first generation attaches it after Places/Routes candidate scoring; Gemini fallback results are tagged with `source: "gemini"` so the UI does not present them as Google-verified results.
- Google-verified results may include `returnRouteDistanceMeters`, `returnRouteDurationMinutes`, and `returnRouteTravelMode` on the final place's `recommendationContext`. The timeline uses these fields to render accommodation return route context without a fixed return time window.
- Gemini-guided Google matching preserves the Gemini draft's Korean display name in `koName`, theme, and stay duration where feasible, normalizes restaurant stops to `meal` and cafe stops to `snack`, and replaces the Google-searchable `placeName`, coordinates, Place ID, rating, review count, opening status, price fields, and previous-leg route time/distance with Google data.
- A Gemini-guided Google result with fewer matched stops than the selected target place count is treated as underfilled for all itinerary intensities. The server first keeps the matched guided stops, excludes their Place IDs and names from the supplemental request, then appends non-duplicate Google-first candidates until the selected 3, 5, or 7 stop target is filled when usable candidates exist.
- If Gemini-guided Google matching returns no usable matches, `generateItineraryFn` falls back to the Google-first candidate engine when Google Places can still be used. It uses unmatched Gemini-only itinerary results only when Google Places matching is unavailable.
- Malformed JSON is rejected as `Invalid Gemini itinerary JSON`.
- JSON that parses but does not match the itinerary schema is rejected as `Invalid Gemini itinerary response schema`.
- The server returns only parsed `ItineraryPlace[]` values to the route layer.

## Fallback Policy

Fallback output does not invent unavailable facts. It uses:

- Embassy emergency phone when present.
- Consular call center when embassy data is unavailable.
- Public data checklist items when their source API exists.
- `unknowns` to state why Gemini-generated content was replaced.
