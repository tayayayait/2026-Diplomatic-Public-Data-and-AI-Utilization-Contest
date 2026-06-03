# MVP Gap Matrix

Last reviewed: 2026-05-28

This reference maps `상세서.md` MVP requirements to the current codebase and the next implementation phase.

## Summary

The current app contains the main TanStack Start screens and a demo flow, with Phase 6 covering product UI traceability and guardian sharing. Remaining MVP gaps are live public-data verification, OCR for image uploads, responsive/accessibility QA, and demo hardening.

## Coverage Matrix

| Requirement                                          | Current Evidence                                                                                                                                                        | Status                                                                 | Next Phase |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------: |
| First screen is an action screen, not a landing page | `/` redirects to `/trips/new`                                                                                                                                           | Implemented                                                            |          - |
| Direct country/date input                            | `src/routes/trips.new.tsx` manual form                                                                                                                                  | Implemented                                                            |          - |
| Text itinerary extraction with Gemini                | `extractItinerary` uses normalized Phase 5 contract output                                                                                                              | Implemented baseline; multimodal OCR remains separate                  |          8 |
| PDF/JPG/PNG/TXT/DOCX upload                          | `document-upload.*` pipeline and `/trips/new` dropzone                                                                                                                  | Partial: TXT/DOCX/PDF text parsing, JPG/PNG OCR still required         |          8 |
| Public data APIs                                     | `public-data-adapter.ts` defines all 14 DOCX guide APIs, documented endpoints, params, normalization, and TTL cache                                                     | Implemented; live calls require valid `DATA_GO_KR_SERVICE_KEY`         |          - |
| Server-side API adapter                              | `public-data.server.ts` and `public-data.functions.ts` route calls through server-only env config                                                                       | Implemented with demo fallback                                         |          - |
| API evidence storage                                 | Adapter captures request params, response snapshot, fetched time, and source update time                                                                                | Implemented for P0 API responses                                       |          - |
| Risk score calculation                               | `scoreCountry`, `levelFromScore`, `RiskProfile` contract, dashboard evidence drawer                                                                                     | Implemented baseline                                                   |          - |
| Dashboard                                            | `/trips/$tripId/dashboard`, `EvidenceDrawer`, API status panel                                                                                                          | Implemented baseline                                                   |          - |
| Checklist                                            | `/trips/$tripId/checklist` renders generated item evidence rows                                                                                                         | Implemented baseline                                                   |          - |
| Emergency card                                       | `/trips/$tripId/emergency` supports print, offline-state badge, and guardian share action                                                                               | Implemented baseline                                                   |          - |
| Guardian share link                                  | `share-storage.server.ts`, `share.functions.ts`, `/share/$shareId`                                                                                                      | Implemented baseline: 7-day file-backed snapshot without raw responses |          - |
| Durable trip storage                                 | `trip-storage.server.ts`, `trip-storage.functions.ts`, and `tripStore` server sync                                                                                      | Implemented with file-backed server storage                            |          - |
| Environment validation                               | `validateServerConfig` checks storage configuration and public-data fallback state                                                                                      | Implemented baseline validation                                        |          - |
| PII masking                                          | `maskSensitiveText` masks resident number, passport, phone, and email before Gemini input                                                                               | Implemented baseline masking                                           |          - |
| Upload file deletion                                 | Original upload bytes are processed in memory and not written to server storage                                                                                         | Implemented baseline no-persist policy                                 |          - |
| API exception states                                 | Adapter normalizes exception states; dashboard summarizes success/warning/failed counts                                                                                 | Implemented baseline                                                   |          - |
| Data model contracts                                 | `contracts.ts` and `contracts.test.ts`                                                                                                                                  | Implemented for Phase 1                                                |          - |
| Automated tests                                      | Unit coverage includes risk, contracts, public-data adapter, config validation, server storage, document upload, Gemini contract, share storage, and product UI helpers | Partial: no browser E2E coverage yet                                   |          7 |
| Documentation index                                  | `docs/index.md` added                                                                                                                                                   | Implemented                                                            |          - |

## Phase Order

| Phase | Goal                                       | Primary Skills                             |
| ----: | ------------------------------------------ | ------------------------------------------ |
|     1 | Data model and type contracts              | Complete                                   |
|     2 | Public data adapter and cache              | Complete                                   |
|     3 | Server API and durable storage             | Complete                                   |
|     4 | File upload, parsing, and privacy controls | Complete baseline                          |
|     5 | Gemini contract hardening                  | Complete baseline                          |
|     6 | Product UI completion                      | Complete baseline                          |
|     7 | Responsive and accessibility QA            | `ui-ux-pro-max`, `frontend-design`         |
|     8 | Demo hardening                             | `senior-fullstack`, `supanova-full-output` |
