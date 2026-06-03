# Public Data API Reference

Last reviewed: 2026-05-28

This project uses the 14 DOCX API guides in `api가이드파일/` as the source of truth for public-data integration. All calls are made server-side through `DATA_GO_KR_SERVICE_KEY`; the client never receives the key.

## Runtime Flow

`src/routes/trips.$tripId.analyzing.tsx` calls `fetchCountryPublicDataServer` for each destination. The server function delegates to `fetchCountryPublicData`, which calls every API below through `public-data-adapter.ts`, normalizes successful responses into `CountryPublicData`, and stores request/response evidence snapshots for the dashboard and Gemini grounding.

If `PUBLIC_DEMO_MODE=true` or `DATA_GO_KR_SERVICE_KEY` is missing, the app uses demo public data instead of live data.

## Applied APIs

| Priority | API ID | API | Purpose | Normalized Section |
| --- | --- | --- | --- | --- |
| P0 | `15095500` | 외교부 국가·지역별 여행경보(0404 대륙정보) | Primary travel alarm level and warning text | `travel_alarm` |
| P0 | `15076237` | 외교부 국가·지역별 여행경보 | Secondary travel alarm source | `travel_alarm` fallback |
| P0 | `15076242` | 외교부 국가·지역별 현지연락처 | Local emergency contact text | `local_contact` |
| P0 | `15075354` | 외교부 국가·지역별 재외공관 정보 | Embassy address and emergency phone | `embassy` |
| P0 | `15075345` | 외교부 국가·지역별 입국허가요건 | Visa and entry-condition checklist evidence | `visa` |
| P1 | `15076236` | 외교부 국가·지역별 사건사고 유형 | Accident/crime/incident context | `accident` |
| P1 | `15099529` | 외교부 국가·지역별 의료환경 | Medical risk signals | `medical` |
| P1 | `15099532` | 외교부 국가·지역별 치안환경 | Security risk signals | `security` |
| P1 | `15099207` | KOICA 현지 안전정보 | Long-stay and volunteer safety context | `koica_safety` |
| P2 | `15076233` | KOICA 일일 안전관리 중점국가 | Daily risk issue and action context | `daily_risk` |
| P2 | `15076240` | KOICA 파견국 안전이슈 월력표 | Date-based safety issue context | `risk_calendar` |
| P2 | `15099206` | KOICA 현지 생활정보 | Long-stay local-life context | `local_life` |
| P2 | `15099209` | KOICA 현지 활동정보 | Volunteer/activity context | `local_activity` |
| P2 | `15076249` | KOICA 해외봉사단 자가안전체감도 | Volunteer safety perception signal | `volunteer_safety_report` |

## Request Parameters

The guide documents use both `serviceKey` and `ServiceKey`. The adapter must preserve the documented casing and sets the value from `DATA_GO_KR_SERVICE_KEY`.

Common request parameters:

| Parameter | Use |
| --- | --- |
| `serviceKey` | Public Data Portal API key for APIs that document lowercase key casing |
| `ServiceKey` | Public Data Portal API key for APIs that document uppercase key casing |
| `returnType=JSON` | JSON response mode where supported |
| `page` / `perPage` | Paging for `15095500` |
| `pageNo` / `numOfRows` | Paging for the other 13 APIs |
| `cond[country_iso_alp2::EQ]` | Preferred country filter, ISO alpha-2 |
| `cond[country_nm::EQ]` | Fallback country filter when ISO2 is absent |
| `cond[type::LIKE]` | Optional KOICA local information category filter |
| `cond[year::EQ]` | Optional KOICA year filter |

The current app sends ISO2 first and country name only when ISO2 is unavailable.

APIs using `ServiceKey`: `15076236`, `15076237`, `15076242`, `15076233`, `15076240`, `15076249`.

`15095500` includes `remark` in the travel alarm response. `15076237` does not document `remark`; it is used only as a secondary travel-alarm source with fields such as `alarm_lvl`, `region_ty`, and `written_dt`.

## Status Handling

Authentication failures are detected only from HTTP 401 or explicit response
header/message fields such as `resultMsg`, `message`, or `returnMsg`. The
adapter must not scan normal data fields such as KOICA `cn`, because valid
activity content can contain words like "인증" and still be a successful
`resultCode=0` response.
