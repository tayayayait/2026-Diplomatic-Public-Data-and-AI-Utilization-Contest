# SafeRoute AI 외부 API 연결 목록

작성일: 2026-05-28  
기준 자료: `api_list_summary.csv`, `api_request_params.csv`, `api_response_elements.csv`, Google AI for Developers 공식 문서  
목적: 실제 구현 시 연결해야 할 외부 API, 공식 링크, 요청 주소, 사용 목적을 한 문서에서 확인한다.

## 1. 필수 외부 서비스

| 우선순위 | 외부 서비스 | 용도 | 인증 | 공식 링크 |
|---:|---|---|---|---|
| P0 | Google Gemini API | 문서 분석, 일정 추출, 공공데이터 근거 기반 요약, 체크리스트·비상카드 생성 | `GEMINI_API_KEY` | [Gemini API 문서](https://ai.google.dev/gemini-api/docs), [API Reference](https://ai.google.dev/api), [Models](https://ai.google.dev/gemini-api/docs/models) |
| P0 | 공공데이터포털 data.go.kr | 외교부·KOICA 공공데이터 조회 | `DATA_GO_KR_SERVICE_KEY` | [공공데이터포털](https://www.data.go.kr/) |

구현 원칙:

1. 클라이언트에서 외부 API를 직접 호출하지 않는다.
2. Gemini API 키와 공공데이터포털 인증키는 서버 환경변수에만 저장한다.
3. 모든 공공데이터 응답은 서버에서 정규화한 뒤 UI에 전달한다.
4. Gemini 출력은 JSON schema 검증 후 저장한다.

## 2. MVP 필수 API

아래 API는 SafeRoute AI MVP에서 반드시 연결한다. 이 5개가 연결되어야 여행경보, 입국요건, 재외공관, 현지 연락처, 비상 카드가 동작한다.

| 우선순위 | API ID | 기관 | API명 | 데이터 | 사용 기능 | 공식 상세 링크 | 요청 주소 |
|---:|---:|---|---|---|---|---|---|
| P0 | 15095500 | 외교부 | 국가·지역별 여행경보 목록 조회(0404 대륙정보) | JSON | 위험 점수, 국가 카드, 경보 요약 | [data.go.kr 상세](https://www.data.go.kr/data/15095500/openapi.do) | `http://apis.data.go.kr/1262000/TravelAlarmService0404/getTravelAlarm0404List` |
| P0 | 15076237 | 외교부 | 국가∙지역별 여행경보 | JSON | 여행경보 상세, 위험 지도 링크 | [data.go.kr 상세](https://www.data.go.kr/data/15076237/openapi.do) | `http://apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2` |
| P0 | 15076242 | 외교부 | 국가∙지역별 현지연락처 | JSON | 현지 긴급 연락처, 비상 카드 | [data.go.kr 상세](https://www.data.go.kr/data/15076242/openapi.do) | `http://apis.data.go.kr/1262000/LocalContactService2/getLocalContactList2` |
| P0 | 15075354 | 외교부 | 국가·지역별 재외공관 정보 | JSON | 대사관명, 전화번호, 주소, 좌표 | [data.go.kr 상세](https://www.data.go.kr/data/15075354/openapi.do) | `http://apis.data.go.kr/1262000/EmbassyService2/getEmbassyList2` |
| P0 | 15075345 | 외교부 | 국가·지역별 입국허가요건 | JSON | 여권·비자·무비자 조건 체크리스트 | [data.go.kr 상세](https://www.data.go.kr/data/15075345/openapi.do) | `http://apis.data.go.kr/1262000/EntranceVisaService2/getEntranceVisaList2` |

## 3. MVP 권장 API

아래 API는 위험 판단의 품질을 높인다. MVP에서 시간이 부족하면 P0 이후 순서대로 연결한다.

| 우선순위 | API ID | 기관 | API명 | 데이터 | 사용 기능 | 공식 상세 링크 | 요청 주소 |
|---:|---:|---|---|---|---|---|---|
| P1 | 15076236 | 외교부 | 국가∙지역별 사건사고 유형 | JSON | 사건사고 요약, 상위 위험 요인 | [data.go.kr 상세](https://www.data.go.kr/data/15076236/openapi.do) | `http://apis.data.go.kr/1262000/CountryAccidentService2/CountryAccidentService2` |
| P1 | 15099529 | 외교부 | 국가·지역별 의료환경 | JSON | 의료·보건 리스크 보정 | [data.go.kr 상세](https://www.data.go.kr/data/15099529/openapi.do) | `http://apis.data.go.kr/1262000/MedicalEnvironmentService/getMedicalEnvironmentList` |
| P1 | 15099532 | 외교부 | 국가·지역별 치안환경 | JSON | 치안환경 보정, 주의 문구 | [data.go.kr 상세](https://www.data.go.kr/data/15099532/openapi.do) | `http://apis.data.go.kr/1262000/SecurityEnvironmentService/getSecurityEnvironmentList` |
| P1 | 15099207 | KOICA | 현지 안전정보 | JSON+XML | 장기 체류·파견 안전정보 | [data.go.kr 상세](https://www.data.go.kr/data/15099207/openapi.do) | `http://apis.data.go.kr/B260003/LocalSafetyInformationService/getLocalSafetyInformationList` |

## 4. 확장 API

아래 API는 유학생, 워홀러, 장기 체류자, 봉사단 대상 기능을 강화할 때 연결한다.

| 우선순위 | API ID | 기관 | API명 | 데이터 | 사용 기능 | 공식 상세 링크 | 요청 주소 |
|---:|---:|---|---|---|---|---|---|
| P2 | 15099206 | KOICA | 현지 생활정보 | JSON | 공휴일, 생활정보, 체류 팁 | [data.go.kr 상세](https://www.data.go.kr/data/15099206/openapi.do) | `http://apis.data.go.kr/B260003/LocalLifeInformationService/getLocalLifeInformationList` |
| P2 | 15099209 | KOICA | 현지 활동정보 | JSON | 봉사·교육·현장 활동 정보 | [data.go.kr 상세](https://www.data.go.kr/data/15099209/openapi.do) | `http://apis.data.go.kr/B260003/LocalActivityInformationService/getLocalActivityInformationList` |
| P2 | 15076233 | KOICA | 일일 안전관리 중점국가 | JSON | KOICA 위험수준 보정 | [data.go.kr 상세](https://www.data.go.kr/data/15076233/openapi.do) | `http://apis.data.go.kr/B260003/RiskPredictionService2/getRiskPredictionList2` |
| P2 | 15076240 | KOICA | 파견국 안전이슈 월력표 | JSON | 일정 기간 중 위험 이벤트 | [data.go.kr 상세](https://www.data.go.kr/data/15076240/openapi.do) | `http://apis.data.go.kr/B260003/RiskCalendarService2/getRiskCalendarList2` |
| P3 | 15076249 | KOICA | 해외봉사단 자가안전체감도 | JSON | 체감 안전도 보조 지표 | [data.go.kr 상세](https://www.data.go.kr/data/15076249/openapi.do) | `http://apis.data.go.kr/B260003/RiskReportService2/getRiskReportList2` |

## 5. 보류 API

아래 API는 서비스 가치가 높지만, 현재 로컬 수집 자료 기준 요청변수·출력결과 표가 확보되지 않았다. 공식 페이지에서 실제 명세를 다시 확인한 뒤 연결한다.

| 우선순위 | API ID | 기관 | API명 | 데이터 | 보류 사유 | 공식 상세 링크 |
|---:|---:|---|---|---|---|---|
| 보류 | 15076239 | 외교부 | 국가∙지역별 안전공지 | JSON | 요청주소, 요청변수, 출력결과 미확보 | [data.go.kr 상세](https://www.data.go.kr/data/15076239/openapi.do) |
| 보류 | 15076244 | 외교부 | 국가∙지역별 특별여행주의보 | JSON+XML | 요청주소, 요청변수, 출력결과 미확보 | [data.go.kr 상세](https://www.data.go.kr/data/15076244/openapi.do) |

## 6. 공통 요청 파라미터

| 파라미터 | 적용 | 필수 | 설명 |
|---|---|---:|---|
| `serviceKey` | 일부 외교부·KOICA API | 예 | 공공데이터포털 인증키. 소문자 사용 API |
| `ServiceKey` | 일부 외교부·KOICA API | 예 | 공공데이터포털 인증키. 대문자 사용 API |
| `returnType` | JSON 지원 API | 아니오 | `JSON` 고정 권장 |
| `numOfRows` | pageNo 방식 API | 예 | 국가 1개 조회 10, 전체 동기화 100 |
| `pageNo` | pageNo 방식 API | 예 | 기본 1 |
| `page` | 15095500 | 예 | 기본 1 |
| `perPage` | 15095500 | 예 | 기본 10 |
| `cond[country_iso_alp2::EQ]` | 국가 필터 API | 아니오 | ISO2 코드. 예: `JP`, `TH`, `GH` |
| `cond[country_nm::EQ]` | 국가 필터 API | 아니오 | 한글 국가명. 예: `일본`, `태국`, `가나` |
| `cond[type::LIKE]` | KOICA 생활·안전·활동 API | 아니오 | 예: `안전관리`, `공휴일`, `OJT` |
| `cond[year::EQ]` | KOICA 생활·안전·활동 API | 아니오 | 기준 연도 |

주의:

1. 공공데이터포털 인증키는 URL encode된 값이 필요한 경우가 있다.
2. API별로 `serviceKey`와 `ServiceKey` 대소문자가 다르므로 어댑터 설정에 분리 저장한다.
3. `cond[...]` 파라미터는 URL 인코딩 처리한다.
4. JSON 응답이 실패하면 XML fallback은 P1 이후에 구현한다.

## 7. 환경변수

| 변수 | 필수 | 사용처 |
|---|---:|---|
| `DATA_GO_KR_SERVICE_KEY` | 예 | 외교부·KOICA 공공데이터 API |
| `GEMINI_API_KEY` | 예 | Google Gemini API |
| `PUBLIC_DEMO_MODE` | 아니오 | API 장애 시 데모 샘플 데이터 사용 |

## 8. 연결 순서

1. Gemini API 키 발급 및 `models.list` 또는 공식 모델 문서로 사용 가능 모델 확인
2. 공공데이터포털 회원가입 및 활용신청
3. P0 API 5개 호출 테스트
4. 국가명·ISO2 정규화 모듈 구현
5. P0 API 응답을 `ApiEvidence`로 저장
6. Gemini에 공공데이터 근거를 입력해 JSON 브리핑 생성
7. P1 API 4개를 위험 점수 보정에 연결
8. P2 API를 장기 체류자 기능으로 확장

## 9. MVP에서 추가 외부 API를 붙이지 않는 항목

| 항목 | 이유 | MVP 처리 |
|---|---|---|
| 지도 SDK | 대사관 좌표는 공공데이터에서 확보 가능. SDK 연동은 범위 증가 | 좌표 기반 지도 링크만 제공 |
| 민간 뉴스 API | 공공데이터 활용 심사 초점이 흐려짐 | Gemini가 공공데이터만 요약 |
| 항공권 예약 API | 안전 서비스 핵심과 무관 | 사용자가 업로드한 문서만 분석 |
| 문자 발송 API | 비용·개인정보 이슈 | 공유 링크와 PDF 저장으로 대체 |

## 10. 구현 전 최종 확인

- [ ] `DATA_GO_KR_SERVICE_KEY`로 P0 API 5개가 실제 호출되는가
- [ ] `GEMINI_API_KEY`로 문서 또는 텍스트 입력 분석이 되는가
- [ ] `serviceKey`/`ServiceKey` 대소문자 차이를 API별로 처리했는가
- [ ] API 응답 실패 시 `partial` 또는 `failed` 상태가 정확히 표시되는가
- [ ] 위험 판단 카드에 공식 상세 링크 또는 API 근거가 연결되는가
- [ ] 보류 API를 MVP 필수 기능에 넣지 않았는가
