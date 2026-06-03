# AI 일정 생성기 UX 개선 — 숙소 기반 자동 일정 생성

> **목표:** 사용자가 최소한의 입력(숙소 위치만)으로 이동거리·소요시간·식사·선호를 반영한 **바로 사용 가능한 하루 일정**을 자동으로 받을 수 있도록 개선합니다.

## 현재 상태 분석

### 현재 흐름 (AS-IS)
```
사용자 → 음식 테마 5개 중 다중선택 → 분위기 테마 5개 중 다중선택 → [AI 일정 생성하기] → 장소 목록 + 지도
```

### 문제점
| # | 문제 | 영향 |
|---|------|------|
| 1 | 숙소 위치가 Gemini 프롬프트에 **전혀 전달되지 않음** | 이동 동선 최적화 불가 |
| 2 | 테마 선택이 **사전 필수 행위**로 작동 → 선택 안 하면 기본값 폴백 | 사용자 부담 |
| 3 | 생성 결과에 **이동시간·이동거리** 정보 없음 | 일정의 실용성 저하 |
| 4 | 식사 시간대 **자동 반영** 없음 (식당이 아무 위치에나 배치) | 현실적 일정이 아님 |
| 5 | 결과가 **장소 리스트**일 뿐, 시간 흐름 기반 타임라인이 아님 | 일정으로 사용하기 어려움 |
| 6 | `itineraryStore`의 다일(Multi-Day) 구조가 현재 UI와 **연동되지 않음** | 존재하지만 미사용 |

### 개선 방향 (TO-BE)
```
사용자 → (숙소 위치 자동 로드) → [원터치: AI 일정 생성] → 시간순 타임라인 일정 (이동시간 포함) + 지도 동선
         ↑ 선택적으로 선호도 조정 가능
```

---

## User Review Required

> [!IMPORTANT]
> **Google Maps Directions API 사용 여부**: 장소 간 이동시간·거리를 실제 Google Maps Directions API로 계산할지, 아니면 Gemini에게 직선거리 기반 추정을 맡길지 결정이 필요합니다.
> - **Directions API 사용**: 정확한 도보/대중교통 이동시간 제공 가능, 추가 API 비용 발생
> - **Gemini 추정**: 비용 0원, 다만 정확도 낮음 (직선거리 × 계수)
>
> 아래 계획은 **Gemini 추정 방식을 기본으로, Directions API를 선택적 확장**으로 구성했습니다.

> [!WARNING]
> **Schema 변경**: `ItineraryPlace` 타입에 `order`, `startTime`, `endTime`, `travelFromPrevMinutes`, `travelFromPrevDistance`, `category` 필드가 추가됩니다. 기존에 저장된 일정 데이터와 호환성이 깨질 수 있습니다.

---

## Open Questions

> [!IMPORTANT]
> 1. **일정 시작 시간 기본값**: 오전 9시 기본 → 사용자가 원하면 조절 가능하게 할까요, 아니면 고정?
> 2. **일정 총 시간**: 현재 기본 6시간(360분) → 반일/하루(8시간)/저녁포함(12시간) 중 어떤 기본값?
> 3. **식사 포함 로직**: 점심(12시 전후) + 저녁(18시 전후) 자동 삽입 vs 사용자가 원하는 시점에 수동 추가?
> 4. **다일(Multi-Day) 일정**: 현재 1일 기준으로 먼저 완성 후 확장할까요, 처음부터 2~3일 지원?

---

## Proposed Changes

### Phase 1: 데이터 모델 확장 (Schema & Type)

> **Active Skills:** `concise-planning`, `software-architecture`
>
> **목표:** 시간순 타임라인, 이동 정보, 식사 구분을 지원하는 데이터 구조로 확장

#### [MODIFY] [schema.ts](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/lib/gemini/schema.ts)

`ItineraryPlace` 스키마에 다음 필드 추가:

```diff
+  order: z.number().int().describe("일정 순서 (1부터 시작)"),
+  startTime: z.string().describe("시작 시간 (HH:mm 형식, 예: 09:00)"),
+  endTime: z.string().describe("종료 시간 (HH:mm 형식, 예: 10:30)"),
+  category: z.enum(["attraction", "restaurant", "cafe", "shopping", "nature", "culture"]).describe("장소 유형"),
+  travelFromPrevMinutes: z.number().int().describe("이전 장소에서 이동 소요 시간 (분). 첫 장소는 숙소에서 출발"),
+  travelFromPrevDistance: z.string().describe("이전 장소까지의 거리 (예: 1.2km, 도보 15분)"),
+  mealSlot: z.enum(["breakfast", "lunch", "dinner", "snack", "none"]).describe("식사 시간대 구분"),
```

`geminiItineraryResponseSchema`도 동일하게 확장

---

### Phase 2: Gemini 프롬프트 엔진 개선

> **Active Skills:** `prompt-engineering`, `llm-app-patterns`
>
> **목표:** 숙소 좌표 기준으로 동선 최적화된 시간순 일정을 생성하는 고급 프롬프트 구축

#### [MODIFY] [itinerary.ts](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/lib/gemini/itinerary.ts)

**입력 스키마 확장:**
```diff
  const ItineraryInputSchema = z.object({
    country: z.string(),
    city: z.string().optional(),
+   accommodationLat: z.number().optional(),
+   accommodationLng: z.number().optional(),
+   accommodationAddress: z.string().optional(),
    foodThemes: z.array(z.string()),
    vibeThemes: z.array(z.string()),
    budget: z.string(),
    durationMinutes: z.number(),
+   startTime: z.string().default("09:00"),
+   includeMeals: z.boolean().default(true),
+   mealPreference: z.enum(["local", "quick", "fine_dining"]).default("local"),
  });
```

**프롬프트 구조 전면 개편:**

```markdown
## System Context
- 숙소 위치: {accommodationAddress} (좌표: {lat}, {lng})
- 도시: {city}, {country}

## Constraints
1. 숙소에서 출발 → 관광 → 식사 → 관광 → 숙소 복귀 동선으로 구성
2. 장소 간 이동거리를 최소화하는 **클러스터 기반 동선** 설계
3. 점심(11:30~13:00), 저녁(17:30~19:00) 시간대에 식당/카페 자동 배치
4. 각 장소의 startTime/endTime을 {startTime}부터 시작하여 순차 배정
5. travelFromPrevMinutes: 직선거리 × 1.4 기반 도보 시간 추정
6. 총 일정이 {durationMinutes}분을 넘지 않도록 조절
```

**핵심 변경사항:**
- 숙소 좌표를 프롬프트 컨텍스트에 포함
- 이동시간을 AI가 계산하여 타임라인에 반영
- 식사 시간대 자동 삽입 로직
- `order` 필드로 순서 보장

---

### Phase 3: UI/UX 전면 개편 — 원터치 생성 + 타임라인

> **Active Skills:** `frontend-design`, `ui-ux-pro-max`, `interface-design`, `react-best-practices`
>
> **목표:** 복잡한 다중선택 → 간결한 원터치 생성 + 상세 조절 가능한 타임라인 뷰

#### [MODIFY] [itinerary.tsx](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/routes/itinerary.tsx)

**레이아웃 구조 변경:**

```
AS-IS:
┌─ 좌측 패널 ─────────┐  ┌─ 우측: 지도 ──────────┐
│ 음식 테마 다중선택     │  │                        │
│ 분위기 테마 다중선택   │  │ (결과 없으면 빈 화면)    │
│ [AI 일정 생성] 버튼    │  │                        │
│ ────────────────────  │  │                        │
│ 결과: 장소 카드 리스트  │  │ 결과: 마커 지도         │
└───────────────────────┘  └────────────────────────┘

TO-BE:
┌─ 좌측 패널 ─────────────────────┐  ┌─ 우측: 지도 ────────────┐
│ 📍 내 숙소: [주소 표시 + 변경]    │  │ 숙소 마커 (항상 표시)      │
│ ────────────────────────────    │  │ + 일정 동선 폴리라인       │
│ ⚡ [AI 맞춤 일정 생성하기] 원터치  │  │ + 번호 마커               │
│ ────────────────────────────    │  │                          │
│ 🔧 상세 설정 (접이식, 선택사항)   │  │                          │
│   · 일정 시간: 반나절/하루/저녁    │  │                          │
│   · 분위기 토글                  │  │                          │
│   · 식사 포함 여부               │  │                          │
│ ────────────────────────────    │  │                          │
│ 📋 타임라인 결과                 │  │                          │
│   09:00 숙소 출발                │  │                          │
│   ↓ 도보 15분 (1.2km)           │  │                          │
│   09:15~10:45 ① 오호리 공원      │  │                          │
│   ↓ 도보 10분 (0.8km)           │  │                          │
│   10:55~12:00 ② 구시다 신사      │  │                          │
│   ↓ 도보 5분 (0.4km)            │  │                          │
│   12:00~13:00 🍽 점심: 로컬 맛집  │  │                          │
│   ...                           │  │                          │
│   18:00 숙소 복귀                │  │                          │
└──────────────────────────────────┘  └──────────────────────────┘
```

**주요 UI 변경:**
1. **숙소 위치 섹션** — `userProfile.accommodationLocation` 자동 로드 + 변경 가능
2. **원터치 생성 버튼** — 선호도 미선택 시 프로필 기반 스마트 기본값 적용
3. **상세 설정 (접이식)** — 일정 시간, 분위기, 식사 포함 여부 토글
4. **타임라인 뷰 개편** — 시간 흐름 + 이동구간 시각화

#### [MODIFY] [TimelineView.tsx](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/components/itinerary/TimelineView.tsx)

**전면 재구성:**
- 시간 기반 세로 타임라인 (좌측 시간 레이블 + 우측 장소 카드)
- 이동 구간 표시 (점선 + 이동시간·거리 표기)
- 식사 슬롯 특별 디자인 (아이콘 + 색상 차별화)
- 숙소 출발/복귀 표시
- 카드 선택 시 지도 연동 (현재 기능 유지)

#### [NEW] [TravelSegment.tsx](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/components/itinerary/TravelSegment.tsx)

이동 구간을 시각화하는 컴포넌트:
```
  ↓ 도보 15분 · 1.2km
```
- 점선 연결선
- 이동수단 아이콘 (도보/전철/버스)
- 이동시간 + 거리 표시

#### [NEW] [QuickSettings.tsx](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/components/itinerary/QuickSettings.tsx)

접이식(Collapsible) 상세 설정 패널:
- 일정 시간 선택 (반나절 4h / 하루 8h / 저녁포함 12h)
- 분위기 태그 토글 (기존 테마 유지, 선택 안 해도 됨)
- 식사 포함 여부 토글
- 예산 수준 (저렴/보통/여유)

---

### Phase 4: 지도 동선 시각화 개선

> **Active Skills:** `frontend-design`, `react-best-practices`
>
> **목표:** 일정 동선을 지도 위에 폴리라인으로 시각화하고, 숙소 마커를 항상 표시

#### [MODIFY] [GoogleMapItinerary.tsx](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/components/maps/GoogleMapItinerary.tsx)

**추가 기능:**
1. **동선 폴리라인** — 숙소 → 1번 장소 → 2번 → ... → 숙소 순으로 연결하는 곡선 라인
2. **숙소 마커 항상 표시** — `accommodationLocation`을 itinerary.tsx에서 전달
3. **식사 장소 마커 차별화** — 🍽 아이콘 + 오렌지 색상
4. **선택된 장소 하이라이트** — 해당 구간 폴리라인 강조

---

### Phase 5: 스마트 기본값 & 프로필 연동

> **Active Skills:** `software-architecture`, `kaizen`
>
> **목표:** 사용자가 아무것도 선택하지 않아도 프로필 기반으로 최적 기본값을 적용

#### [MODIFY] [itinerary.tsx](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/routes/itinerary.tsx)

**스마트 기본값 로직:**

```typescript
const getSmartDefaults = (profile: UserProfile) => ({
  // 프로필에 저장된 선호도 자동 반영
  foodThemes: profile.foodPreferences?.length ? profile.foodPreferences : ["현지 로컬 맛집"],
  vibeThemes: profile.placeInterests?.length ? profile.placeInterests : ["필수 랜드마크 & 명소"],
  
  // 체류 목적에 따른 일정 시간
  durationMinutes: profile.stayPurpose === "TRAVEL" ? 480 : 360,
  
  // 예산 수준
  budget: profile.stayPurpose === "STUDY" ? "저렴" : "보통",
  
  // 숙소 위치
  accommodationAddress: profile.accommodationLocation,
  
  // 식사 포함
  includeMeals: true,
});
```

#### [MODIFY] [state.ts](file:///c:/Users/dbcdk/Desktop/2026%EB%85%84%20%EC%99%B8%EA%B5%90%20%EA%B3%B5%EA%B3%B5%EB%8D%B0%EC%9D%B4%ED%84%B0%20%C2%B7%20AI%20%ED%99%9C%EC%9A%A9%20%EA%B2%BD%EC%A7%84%EB%8C%80%ED%9A%8C/src/lib/diplolife/state.ts)

`UserProfile`에 이미 존재하는 `foodPreferences`, `placeInterests`, `accommodationLocation` 필드를 활용하여:
- 온보딩 시 숙소 주소 입력 → Geocoding → 좌표 저장
- 좌표를 `accommodationLat`, `accommodationLng`으로 프로필에 추가 저장

```diff
  export interface UserProfile {
    // ... 기존 필드
    accommodationLocation?: string;
+   accommodationLat?: number;
+   accommodationLng?: number;
  }
```

---

## 전체 Action Items 체크리스트

### Phase 1: 데이터 모델 확장
- [ ] `schema.ts`의 `ItineraryPlaceSchema`에 `order`, `startTime`, `endTime`, `category`, `travelFromPrevMinutes`, `travelFromPrevDistance`, `mealSlot` 필드 추가
- [ ] `geminiItineraryResponseSchema`에 동일 필드 추가
- [ ] `ItineraryPlace` 타입 자동 갱신 확인

### Phase 2: Gemini 프롬프트 엔진 개선
- [ ] `itinerary.ts`의 `ItineraryInputSchema`에 숙소 좌표, 식사 옵션, 시작시간 필드 추가
- [ ] 프롬프트를 숙소 기반 동선 최적화 구조로 전면 재작성
- [ ] 식사 시간대 자동 배치 로직을 프롬프트에 반영
- [ ] `temperature`를 0.3으로 약간 올려 다양성 확보 (현재 0.2)

### Phase 3: UI/UX 전면 개편
- [ ] `itinerary.tsx` — 좌측 패널 레이아웃을 "숙소 + 원터치 + 접이식 설정 + 타임라인"으로 재구성
- [ ] `TimelineView.tsx` — 시간 기반 세로 타임라인 + 이동구간으로 전면 재작성
- [ ] `TravelSegment.tsx` — 이동구간 시각화 컴포넌트 신규 생성
- [ ] `QuickSettings.tsx` — 접이식 상세 설정 패널 신규 생성

### Phase 4: 지도 동선 시각화
- [ ] `GoogleMapItinerary.tsx` — 숙소→장소→숙소 폴리라인 동선 추가
- [ ] 식사 장소 마커 차별화 (아이콘 + 색상)
- [ ] 숙소 마커를 `itinerary.tsx`에서 항상 전달하도록 연결

### Phase 5: 스마트 기본값 & 프로필 연동
- [ ] `itinerary.tsx`에 `getSmartDefaults()` 함수 구현
- [ ] `state.ts`의 `UserProfile`에 `accommodationLat`, `accommodationLng` 필드 추가
- [ ] 숙소 주소 → Geocoding → 좌표 저장 로직 구현
- [ ] 온보딩 완료 시 숙소 좌표 자동 캐싱

---

## Phase별 적용 스킬 요약

| Phase | 핵심 스킬 | 용도 |
|-------|-----------|------|
| **Phase 1** | `software-architecture` | 확장 가능한 데이터 모델 설계 |
| **Phase 2** | `prompt-engineering`, `llm-app-patterns` | 고품질 Gemini 프롬프트 & 구조화 출력 |
| **Phase 3** | `frontend-design`, `ui-ux-pro-max`, `interface-design`, `react-best-practices` | 프리미엄 UI 구현 & React 최적화 |
| **Phase 4** | `frontend-design`, `react-best-practices` | 지도 시각화 & 인터랙션 |
| **Phase 5** | `software-architecture`, `kaizen` | 스마트 기본값 & 지속적 개선 |

---

## Verification Plan

### Automated Tests
```bash
# 기존 테스트 유지 확인
bunx vitest run src/store/itineraryStore.test.ts
bunx vitest run src/lib/diplolife/state.test.ts

# 새 스키마 검증 테스트
bunx vitest run src/lib/gemini/schema.test.ts
```

### 수동 검증
1. **숙소 미입력 상태**에서 원터치 생성 → 기본값으로 정상 동작 확인
2. **숙소 입력 상태**에서 원터치 생성 → 숙소 기반 동선 확인
3. **타임라인 뷰**에서 시간 흐름 + 이동구간 표시 확인
4. **지도**에서 동선 폴리라인 + 숙소 마커 표시 확인
5. **접이식 설정** 열기/닫기 + 옵션 변경 후 재생성 확인
6. **모바일 반응형** 레이아웃 확인 (좌측 패널 → 하단 시트)

### 브라우저 테스트
- Playwright를 통한 E2E 테스트 (일정 생성 전체 흐름)
- 반응형 뷰포트 테스트 (375px, 768px, 1280px)

---

## Phase 6: 일정 타임라인 시간 계산 및 배치 로직 고도화 (추가)

> **Active Skills:** `software-architecture`, `kaizen`
>
> **요청 배경:** 사용자가 선택한 시작 시간(예: 11:00)과 일정 범위(예: 8시간)가 실제 일정 생성 시 장소별 방문/체류 시간에 자동 배치되고 자연스럽게 계산되는 구조로 고도화 요청.

### 현재 구현된 로직 확인 (정상 작동 중)
현재 시스템의 `gemini-guided-google-itinerary.ts` 로직은 이미 사용자가 원하는 방식(자동 계산 및 배치)으로 동작하고 있습니다.
1. 사용자가 선택한 `startTime`(예: 11:00)을 기준 시간(`currentMinutes`)으로 삼습니다.
2. AI가 제안한 장소 순서대로 Google Maps API를 호출해 **실제 이동 시간**을 계산하고 도착 시간을 산출합니다.
3. 도착 시간에 **장소별 권장 체류 시간**을 더해 출발 시간을 명확히 산출합니다.
4. 이 시간이 누적되면서 다음 장소의 `startTime`, `endTime`으로 계속 덮어씌워지며 일정이 블록처럼 자동 배치됩니다.
5. 계산된 시간이 `maxEndMinutes`(예: 11:00 + 8시간 = 19:00)를 초과하면 해당 장소를 제외합니다.

### 추가 개선해야 할 작업 (Action Items)
비록 기본 구조는 완벽하나, 19:00 정각 전후에 일정을 더 자연스럽게 맞추기 위해 다음 작업을 추가로 진행합니다.

#### [MODIFY] `gemini-guided-google-itinerary.ts`

**1. 숙소 복귀 시간을 포함한 엄격한 타임라인 종료 보장**
- 현재는 마지막 장소 체류 종료 시간이 `maxEndMinutes`를 넘는지만 검사합니다.
- **개선:** 현재 장소에서 일정을 마치고 **숙소로 돌아가는 예상 이동 시간**까지 미리 더해본 뒤, 그 최종 귀가 시간이 `maxEndMinutes`를 초과할 경우 해당 장소를 컷오프하는 방식으로 수정하여, 약속된 종료 시간에 정확히 일정이 끝나도록 보장합니다.

**2. 유휴 시간 최소화 및 체류 시간 유연 조절 (Optional)**
- 장소 컷오프 이후 일정이 너무 일찍 끝난 경우(예: 17:30 종료, 1시간 30분 남음), 남은 시간을 기존에 배정된 장소들의 체류 시간에 비례하여 조금씩 분배해주어 19:00에 가깝게 맞춰주는 "체류 시간 동적 분배 로직"을 추가 검토합니다.
