# Google Places

Phase 3 adds Google Places integration for consumer-useful local essentials. Phase 8 extends Google Maps Platform usage to local itinerary place cards. Phase 2 of the Google-first itinerary work adds a Google Places candidate engine and connects `generateItineraryFn` to prefer that engine when `GOOGLE_PLACES_API_KEY` and a departure basis are available. The follow-up Phase 3 transparency work exposes the actual recommendation policy and per-place evidence in `/itinerary`.

## Scope

The dashboard can now show local search results for:

- Hospitals
- Pharmacies
- Police stations

Current local itinerary screens still call `generateItineraryFn`. The server function now uses Gemini as the planning layer when both Gemini and Google Places keys are available, then matches Gemini draft stops to Google Places Text Search results before returning user-visible places. If Gemini-guided matching produces no usable Google Places matches, the server falls back to the Google-first candidate engine so returned places still come from Google data when a Google key and departure basis exist.

The Gemini-guided and Google-first local itinerary generators use Google Maps Platform data to avoid arbitrary itinerary numbers:

- Google Places Nearby Search (New) collects candidates from a departure-centered travel-mode hard-cap radius using included place types and explicit rank preference.
- Google Places Text Search (New) is reserved for keyword-heavy preferences and uses a travel-mode hard-cap location bias.
- Gemini-guided matching uses Gemini to draft route order, place intent, meal timing, stay duration, and the user-facing `placeIntroduction`. It replaces draft place names, coordinates, Place IDs, price fields, ratings, opening status, and route fields with Google Places and Routes data before returning the itinerary. If Gemini-guided matching returns no usable Google matches and the system falls back to the Google-first candidate engine, the server sends the confirmed Google-first places back to Gemini to generate `placeIntroduction` before returning the itinerary.
- If a Gemini-guided result contains fewer stops than the selected itinerary-intensity target, the server treats it as underfilled for every intensity level: relaxed 3, normal 5, and tight 7. It keeps the matched Gemini-guided stops, adds those stops to the Google-first exclusion list, and appends non-duplicate Google-first candidates until the target is filled when usable candidates are available.
- Address-only departures are resolved with Google Places Text Search before Nearby Search.
- Candidate responses return address, place ID, Google Maps URI, website URI, rating, review count, opening-hours status, business status, primary type, location, price range, and price level.
- Routes API `computeRoutes` calculates distance and travel time from the accommodation or previous place to the next place for the active travel modes. The final place also receives return-to-accommodation route metadata so the timeline can show route context instead of a static closing row.
- If Google price or route data is missing, the card shows "Google information unavailable" instead of inventing an AI price or travel time.

The app uses the destination city when available, otherwise the destination country name.

## API

Server code may call Places API Nearby Search (New) for candidate collection:

```text
POST https://places.googleapis.com/v1/places:searchNearby
```

Nearby Search requests must include a `locationRestriction.circle` with center coordinates and radius, plus one or more `includedTypes` or `includedPrimaryTypes` when the preference maps cleanly to Google place types.

Server code may call Places API Text Search (New) for keyword fallback:

```text
POST https://places.googleapis.com/v1/places:searchText
```

The request uses `X-Goog-Api-Key` and `X-Goog-FieldMask`. The field mask is intentionally limited to display name, address, phone, rating, Google Maps URI, place ID, location, and primary type.

The itinerary request uses a separate minimal field mask for itinerary cards:

```text
places.id,places.displayName,places.formattedAddress,places.googleMapsUri,places.websiteUri,places.location,places.priceLevel,places.priceRange,places.primaryType,places.primaryTypeDisplayName,places.rating,places.regularOpeningHours,places.reviews,places.types,places.userRatingCount
```

The Phase 2 Google-first engine currently requests this narrower candidate mask:

```text
places.businessStatus,places.displayName,places.formattedAddress,places.googleMapsUri,places.id,places.location,places.priceLevel,places.priceRange,places.primaryType,places.rating,places.regularOpeningHours,places.userRatingCount,places.websiteUri
```

Itinerary travel time and distance use Routes API:

```text
POST https://routes.googleapis.com/directions/v2:computeRoutes
```

The existing route enrichment field mask is limited to:

```text
routes.duration,routes.distanceMeters
```

Phase 2 orders selected candidates with nearest-neighbor route efficiency before calling Routes API for each final leg. For each leg, the engine requests every user-selected travel mode, prefers walking when the walking route is at most 1.2 km and 20 minutes, and otherwise uses the fastest valid selected mode. It does not yet call `optimizeWaypointOrder`.

## Recommendation Policy

The policy lives in `src/lib/itinerary/recommendation-policy.ts`.

- Search radius: default walkable 3 km, expanded walkable 5 km, urban hard cap 8 km, transit-assisted maximum 15 km. Candidate collection uses the selected travel mode's hard cap so farther high-value places can compete, while scoring still discounts longer distance.
- Default sort mode: `route_optimized`.
- Score weights: preference match 30, route efficiency 20, Google popularity 30, opening-hours fit 10, budget fit 5, category diversity 5.
- Request contract: country is required; departure must contain a non-empty address or finite coordinates; start time is `HH:mm`; explicit `targetPlaceCount` is 3-7; `durationMinutes` remains a legacy soft planning field and defaults to 480 when omitted. Search radius defaults from the active travel modes. `budgetPlan` is optional but, when provided, includes total KRW budget, stay days, daily KRW budget, local daily category allocation, target currency, and strategy.
- Preference mapping: selected food and place themes are converted into Google place search intents before candidate collection. Unknown themes fall back to localized text queries instead of being discarded.
- Preference diversity: after satisfying the required meal/attraction/cafe mix, final selection keeps representative candidates from each selected place and food theme when capacity allows. This prevents one high-popularity theme from crowding out newly selected preferences.
- Intensity scaling: `relaxed` maps to 3 stops, `normal` maps to 5 stops, and `tight` maps to 7 stops. `selectTargetPlaceCount` prioritizes explicit `targetPlaceCount` and only falls back to legacy duration-derived scaling when that value is absent.
- Intensity fulfillment: `generateItineraryFn` does not accept a partial Gemini-guided Google result just because at least one place matched. When the result is below the selected target, the server requests supplemental Google-first candidates with already matched Place IDs and place names excluded, then returns the original matches plus non-duplicate supplemental candidates up to the target count.
- Budget strategy mapping: the user-selected strategy is retained as-is and does not create Google Text Search `priceLevels` hard filters. `dailyBudgetKrw` and local food/activity allocations are used only as soft price-fit scoring signals for paid restaurants, cafes, attractions, and shopping/experience stops. Famous, highly rated, or otherwise high-value places can outrank cheaper options when they materially improve the itinerary.
- Regeneration diversity: `/itinerary` sends already displayed place IDs and both `placeName`/`koName` values as exclusions on the next generation request. Gemini-guided matching and Google-first candidate collection remove exact Google Place ID matches, exact name matches, and similar localized/translated names before scoring. Gemini fallback receives the same place-name avoid list in the prompt.
- Multi-day exclusions: `/itinerary` generates only Day 1 from the main generation button. Later Day tabs stay empty until the user selects that Day and presses the per-day generation action. Each later Day request accumulates earlier generated Day place IDs/names into its exclusion list before requesting the next Day.
- Multi-day diversity: Day payloads are adjusted with a day-specific area and food profile before candidate collection. The generic profile rotates central landmarks/markets, parks/museums/shopping, and waterfront/day-trip routes. Fukuoka receives explicit Hakata/Nakasu, Tenjin/Ohori, and Dazaifu/Momochi-style hints to reduce repeated areas and restaurant categories.

## Recommendation Transparency

Generated `ItineraryPlace` objects may include `recommendationContext`.

- Gemini-guided Google matches and Google-first results set `source: "google_places"` and include search radius, sort mode, matched preference, preference kind, score, distance from departure, route distance/time, rating, review count, opening-hours status, price level/range, and business status when Google returns those fields.
- Gemini fallback results set `source: "gemini"` with the fixed default radius and route-optimized sort mode so the UI can state that Google Places evidence was not used.
- `/itinerary` renders `RecommendationCriteriaPanel`, which shows source, radius policy, sort policy, exclusion rule, and score weights.
- `/itinerary` renders a budget-plan panel near the generation button and passes the structured budget plan to itinerary generation.
- `/cost` does not generate local itinerary results directly. It links to `/itinerary` with `budgetKrw` when a living-cost budget exists; `/itinerary` then owns the actual budget strategy and generation action.
- Timeline cards render a `장소 소개` section from `placeIntroduction` so travelers can understand what the place is and why it is worth visiting. Expected arrival/departure fields, the previous per-card `추천 이유` block, and compact recommendation evidence badges are not shown on the place card; recommendation policy remains visible in `RecommendationCriteriaPanel`.

## Environment

Set this key on the server:

```powershell
$env:GOOGLE_PLACES_API_KEY="..."
```

If the key is missing, the app does not pretend that live Places data exists. It shows Google Maps search links for the same categories and marks the result as fallback.

For itinerary generation, the same key must have Places API (New) and Routes API enabled. If the Google-first path returns no usable places, `generateItineraryFn` falls back to Gemini generation.

For the browser map, set this optional key when using Google Advanced Markers:

```powershell
$env:VITE_GOOGLE_MAPS_MAP_ID="..."
```

If no real map ID is configured, the itinerary map uses standard Google markers instead of passing the demo map ID.

`/itinerary` lazy-loads `APIProvider`, `GoogleMapItinerary`, and the generated itinerary workspace, then uses one `APIProvider` instance with the `places` and `geocoding` libraries for the itinerary map and the departure-location input. The shared `LocationSearchInput` still has its own script loader for screens that do not provide `APIProvider`, but the itinerary screen disables that loader to prevent loading the Google Maps JavaScript API twice.

The itinerary map builds per-leg route segments from the generated Google Place coordinates and renders Google Maps Directions paths in the browser. It also shows a compact route-time overlay for the selected or first visible legs using the server-computed Routes API minutes and distance.

Current browser console warnings are migration notices, not functional errors:

- `google.maps.Marker` is still used as a fallback when `VITE_GOOGLE_MAPS_MAP_ID` is not configured.
- `google.maps.places.Autocomplete` is still used by the shared input and should be migrated to `PlaceAutocompleteElement` before relying on newly issued Google Maps projects.

## Cost Display Rules

- `priceRange` is displayed directly when Google provides it. The app does not convert or inflate the amount.
- `priceLevel` is displayed as a Google price category when no `priceRange` exists.
- If neither field exists on a matched Google Place, the card displays "Google Places 가격 필드 미제공" and links to the Google-provided website URI when available.
- If Google Places does not match the place, the card displays "Google Places 장소 미확인" and links to the Google Maps search fallback.
- The app does not show AI-generated menu prices, market spend, ticket prices, or KRW conversions as verified values.

## Place Matching Rules

- The Phase 2 Google-first engine starts from Nearby Search for mapped preferences or Text Search for unknown keyword preferences.
- Text Search fallback uses a departure-centered travel-mode hard-cap `locationBias.circle` when searching preference keywords.
- The engine deduplicates by place ID or name/address, excludes candidates that are temporarily or permanently closed, and removes candidates that match excluded places by Google Place ID, normalized name, or similar Korean/English alias tokens.
- Address-only departure resolution uses Text Search with `pageSize: 1`; if no coordinate is returned, the Google-first path returns no places and Gemini fallback handles the request.

## Tower Bridge Verification

Live checks on 2026-05-31 showed:

- `Tower Bridge London` matched Google Place ID `ChIJSdtli0MDdkgRLW9aCBpCeJ4`.
- Text Search (New) and Place Details returned rating, review count, Google Maps URI, and `websiteUri`, but no `priceRange` or `priceLevel` value.
- A full Place Details field check returned no ticket, admission, booking, fare, or cost field.
- Google Maps UI can display an entry-ticket price separately from the general Places API price fields, so the app must treat it as official-site/Google Maps ticket context rather than a verified Places API price.

## Files

- `src/lib/diplolife/api/itinerary-enrichment.ts`
- `src/lib/diplolife/api/gemini-recommendation.ts`
- `src/lib/gemini/itinerary.ts`
- `src/lib/itinerary/gemini-guided-google-itinerary.ts`
- `src/lib/itinerary/google-first-itinerary.ts`
- `src/lib/itinerary/google-first-place-builder.ts`
- `src/lib/itinerary/google-itinerary-scoring.ts`
- `src/lib/itinerary/google-place-candidates.ts`
- `src/lib/itinerary/google-places-api.ts`
- `src/lib/itinerary/google-routes-api.ts`
- `src/lib/itinerary/recommendation-policy.ts`
- `src/lib/itinerary/recommendation-explanation.ts`
- `src/components/itinerary/RecommendationCriteriaPanel.tsx`
- `src/components/diplolife/cards/PlaceCard.tsx`
