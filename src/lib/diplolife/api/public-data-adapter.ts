import type {
  ApiEvidence,
  ApiStatus,
  CountryPublicData,
  PublicDataRequest,
  PublicDataResult,
} from "./types";

const HOUR = 60 * 60 * 1000;

export type PublicDataApiDefinition = {
  apiId: string;
  apiName: string;
  endpoint: string;
  keyParam: "serviceKey" | "ServiceKey";
  paging: "page" | "pageNo";
  cacheTtlMs: number;
  dateField?: string;
  supportsReturnType?: boolean;
};

export const API_DEFINITIONS: Record<string, PublicDataApiDefinition> = {
  "15095500": {
    apiId: "15095500",
    apiName: "외교부_국가·지역별 여행경보(0404 대륙정보)",
    endpoint: "http://apis.data.go.kr/1262000/TravelAlarmService0404/getTravelAlarm0404List",
    keyParam: "serviceKey",
    paging: "page",
    cacheTtlMs: 6 * HOUR,
    dateField: "written_dt",
  },
  "15076237": {
    apiId: "15076237",
    apiName: "외교부_국가·지역별 여행경보",
    endpoint: "http://apis.data.go.kr/1262000/TravelAlarmService2/getTravelAlarmList2",
    keyParam: "ServiceKey",
    paging: "pageNo",
    cacheTtlMs: 6 * HOUR,
    dateField: "written_dt",
  },
  "15076242": {
    apiId: "15076242",
    apiName: "외교부_국가·지역별 현지연락처",
    endpoint: "http://apis.data.go.kr/1262000/LocalContactService2/getLocalContactList2",
    keyParam: "ServiceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    dateField: "wrt_dt",
  },
  "15075354": {
    apiId: "15075354",
    apiName: "외교부_국가·지역별 재외공관 정보",
    endpoint: "http://apis.data.go.kr/1262000/EmbassyService2/getEmbassyList2",
    keyParam: "serviceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
  },
  "15075345": {
    apiId: "15075345",
    apiName: "외교부_국가·지역별 입국허가요건",
    endpoint: "http://apis.data.go.kr/1262000/EntranceVisaService2/getEntranceVisaList2",
    keyParam: "serviceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
  },
  "15076236": {
    apiId: "15076236",
    apiName: "외교부_국가·지역별 사건사고 유형",
    endpoint: "http://apis.data.go.kr/1262000/CountryAccidentService2/CountryAccidentService2",
    keyParam: "ServiceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    dateField: "wrt_dt",
  },
  "15099529": {
    apiId: "15099529",
    apiName: "외교부_국가·지역별 의료환경",
    endpoint: "http://apis.data.go.kr/1262000/MedicalEnvironmentService/getMedicalEnvironmentList",
    keyParam: "serviceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    supportsReturnType: false,
  },
  "15099532": {
    apiId: "15099532",
    apiName: "외교부_국가·지역별 치안환경",
    endpoint: "http://apis.data.go.kr/1262000/SecurityEnvironmentService/getSecurityEnvironmentList",
    keyParam: "serviceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    supportsReturnType: false,
  },
  "15099207": {
    apiId: "15099207",
    apiName: "KOICA_현지 안전정보",
    endpoint:
      "http://apis.data.go.kr/B260003/LocalSafetyInformationService/getLocalSafetyInformationList",
    keyParam: "serviceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    dateField: "year",
    supportsReturnType: false,
  },
  "15076233": {
    apiId: "15076233",
    apiName: "KOICA_일일 안전관리 중점국가",
    endpoint: "http://apis.data.go.kr/B260003/RiskPredictionService2/getRiskPredictionList2",
    keyParam: "ServiceKey",
    paging: "pageNo",
    cacheTtlMs: 6 * HOUR,
    dateField: "report_dt",
  },
  "15076240": {
    apiId: "15076240",
    apiName: "KOICA_파견국 안전이슈 월력표",
    endpoint: "http://apis.data.go.kr/B260003/RiskCalendarService2/getRiskCalendarList2",
    keyParam: "ServiceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    dateField: "icdt_occur_start_dt",
  },
  "15099206": {
    apiId: "15099206",
    apiName: "KOICA_현지 생활정보",
    endpoint: "http://apis.data.go.kr/B260003/LocalLifeInformationService/getLocalLifeInformationList",
    keyParam: "serviceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    dateField: "year",
    supportsReturnType: false,
  },
  "15099209": {
    apiId: "15099209",
    apiName: "KOICA_현지 활동정보",
    endpoint:
      "http://apis.data.go.kr/B260003/LocalActivityInformationService/getLocalActivityInformationList",
    keyParam: "serviceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    dateField: "year",
    supportsReturnType: false,
  },
  "15076249": {
    apiId: "15076249",
    apiName: "KOICA_해외봉사단 자가안전체감도",
    endpoint: "http://apis.data.go.kr/B260003/RiskReportService2/getRiskReportList2",
    keyParam: "ServiceKey",
    paging: "pageNo",
    cacheTtlMs: 24 * HOUR,
    dateField: "year",
  },
};

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

type CacheEntry = {
  expiresAt: number;
  value: PublicDataResult;
};

export class MemoryPublicDataCache {
  private entries = new Map<string, CacheEntry>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  get(key: string): PublicDataResult | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: PublicDataResult, ttlMs: number) {
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
  }
}

export function buildPublicDataUrl(
  definition: PublicDataApiDefinition,
  request: PublicDataRequest,
  serviceKey: string,
): { url: URL; requestParams: Record<string, string> } {
  const url = new URL(definition.endpoint);
  const requestParams: Record<string, string> = {
    [definition.keyParam]: serviceKey,
  };
  if (definition.supportsReturnType !== false) requestParams.returnType = "JSON";

  if (definition.paging === "page") {
    requestParams.page = String(request.page ?? 1);
    requestParams.perPage = String(request.perPage ?? 10);
  } else {
    requestParams.pageNo = String(request.page ?? 1);
    requestParams.numOfRows = String(request.perPage ?? 10);
  }

  if (request.countryIsoAlp2) {
    requestParams["cond[country_iso_alp2::EQ]"] = request.countryIsoAlp2;
  } else if (request.countryNm) {
    requestParams["cond[country_nm::EQ]"] = request.countryNm;
  }
  if (request.year) requestParams["cond[year::EQ]"] = request.year;
  if (request.type) requestParams["cond[type::LIKE]"] = request.type;

  for (const [key, value] of Object.entries(requestParams)) {
    url.searchParams.set(key, value);
  }

  return { url, requestParams };
}

export async function fetchPublicDataApi(opts: {
  definition: PublicDataApiDefinition;
  request: PublicDataRequest;
  serviceKey: string;
  cache?: MemoryPublicDataCache;
  fetcher?: Fetcher;
  now?: () => string;
}): Promise<PublicDataResult> {
  const fetcher = opts.fetcher ?? fetch;
  const fetchedAt = opts.now?.() ?? new Date().toISOString();
  const built = buildPublicDataUrl(opts.definition, opts.request, opts.serviceKey);
  const cacheKey = built.url.toString();
  const cached = opts.cache?.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetcher(built.url);
    const text = await response.text();
    const payload = parseResponseBody(text);
    const items = extractItems(payload).map((item) => sanitizeItem(item));
    const status = normalizeApiStatus(payload, response.status, items);
    const totalCount = extractTotalCount(payload);
    const sourceUpdatedAt = firstString(items[0]?.[opts.definition.dateField ?? ""]);
    const result: PublicDataResult = {
      ok: status === "success" || status === "empty",
      apiId: opts.definition.apiId,
      apiName: opts.definition.apiName,
      status,
      items,
      totalCount,
      fetchedAt,
      sourceUpdatedAt,
      requestParams: built.requestParams,
      responseSnapshot: payload,
      error:
        status === "success" || status === "empty"
          ? undefined
          : {
              code: status,
              message: extractErrorMessage(payload, response.status),
              retryable: status === "rate_limited" || status === "network_error",
            },
    };
    opts.cache?.set(cacheKey, result, opts.definition.cacheTtlMs);
    return result;
  } catch (error) {
    return {
      ok: false,
      apiId: opts.definition.apiId,
      apiName: opts.definition.apiName,
      status: "network_error",
      items: [],
      fetchedAt,
      requestParams: built.requestParams,
      responseSnapshot: null,
      error: {
        code: "network_error",
        message: error instanceof Error ? error.message : "네트워크 연결 실패",
        retryable: true,
      },
    };
  }
}

export function normalizeApiStatus(
  payload: unknown,
  httpStatus: number,
  items = extractItems(payload),
): ApiStatus {
  if (httpStatus === 401 || hasAuthFailureText(payload)) return "unauthorized";
  if (httpStatus === 429) return "rate_limited";
  if (httpStatus < 200 || httpStatus >= 300) return "network_error";

  const code = findFirstString(payload, ["resultCode", "code", "returnCode"]);
  const message = findFirstString(payload, ["resultMsg", "resultMessage", "message", "returnMsg"]);
  const success =
    !code ||
    code === "0" ||
    code === "00" ||
    code.toUpperCase() === "SUCCESS" ||
    message?.toUpperCase() === "SUCCESS" ||
    message === "정상";
  if (!success) return hasAuthFailureText(payload) ? "unauthorized" : "schema_error";
  return items.length > 0 ? "success" : "empty";
}

export function toCountryPublicData(
  iso2: string,
  countryName: string,
  results: PublicDataResult[],
): CountryPublicData {
  const data: CountryPublicData = {
    apiStatuses: Object.fromEntries(results.map((result) => [result.apiId, result.status])),
    evidences: results.map((result) => toEvidence(iso2, result)),
  };

  for (const result of results) {
    const item = result.items[0] ?? {};
    if (result.apiId === "15095500" || result.apiId === "15076237") {
      if (!data.travel_alarm && result.status === "success") {
        data.travel_alarm = {
          source_api_id: result.apiId === "15095500" ? "15095500" : "15076237",
          country_nm: asText(item.country_nm, countryName),
          country_iso_alp2: asText(item.country_iso_alp2, iso2),
          alarm_lvl: parseAlarmLevel(item.alarm_lvl),
          region_ty: asText(item.region_ty, ""),
          remark: result.apiId === "15095500" ? asText(item.remark, "") : "",
          written_dt: asText(item.written_dt, result.sourceUpdatedAt ?? ""),
          dang_map_download_url: asText(item.dang_map_download_url, ""),
          flag_download_url: asText(item.flag_download_url, ""),
          map_download_url: asText(item.map_download_url, ""),
        };
      }
    } else if (result.apiId === "15076242" && result.status === "success") {
      data.local_contact = {
        country_nm: asText(item.country_nm, countryName),
        contact_remark: asText(item.contact_remark, "확실한 정보 없음"),
        wrt_dt: asText(item.wrt_dt, result.sourceUpdatedAt ?? ""),
      };
    } else if (result.apiId === "15075354" && result.status === "success") {
      data.embassy = {
        embassy_kor_nm: asText(item.embassy_kor_nm, "확실한 정보 없음"),
        embassy_addr: asText(item.embassy_addr, "확실한 정보 없음"),
        tel_no: asText(item.tel_no, "—"),
        urgency_tel_no: asText(item.urgency_tel_no, "—"),
        free_tel_no: asText(item.free_tel_no, "—"),
        center_tel_no: asText(item.center_tel_no, ""),
        embassy_lat: asText(item.embassy_lat, ""),
        embassy_lng: asText(item.embassy_lng, ""),
      };
    } else if (result.apiId === "15075345" && result.status === "success") {
      data.visa = {
        have_yn: asYn(item.have_yn),
        gnrl_pspt_visa_yn: asYn(item.gnrl_pspt_visa_yn),
        gnrl_pspt_visa_cn: asText(item.gnrl_pspt_visa_cn, "확실한 정보 없음"),
        nvisa_entry_evdc_cn: asText(item.nvisa_entry_evdc_cn, "확실한 정보 없음"),
        remark: asText(item.remark, ""),
      };
    } else if (result.apiId === "15076236" && result.status === "success") {
      data.accident = {
        current_travel_alarm: asText(item.current_travel_alarm, ""),
        remark: asText(item.news ?? item.remark, ""),
        wrt_dt: asText(item.wrt_dt, result.sourceUpdatedAt ?? ""),
      };
    } else if (result.apiId === "15099529" && result.status === "success") {
      data.medical = {
        current_travel_alarm: asText(item.current_travel_alarm, ""),
        clean_water_use_rate: asText(item.clean_water_use_rate, ""),
        tuber_pr_hndrd_thsnd_ppl_outbreak_rate: asText(item.tuber_pr_hndrd_thsnd_ppl_outbreak_rate, ""),
        clean_water_use_rate_year: asText(item.clean_water_use_rate_year, ""),
        tuber_pr_hndrd_thsnd_ppl_outbreak_rate_year: asText(item.tuber_pr_hndrd_thsnd_ppl_outbreak_rate_year, ""),
      };
    } else if (result.apiId === "15099532" && result.status === "success") {
      data.security = {
        current_travel_alarm: asText(item.current_travel_alarm, ""),
        unemployment_rate: asText(item.unemployment_rate, ""),
        suicide_death_rate: asText(item.suicide_death_rate, ""),
        unemployment_rate_year: asText(item.unemployment_rate_year, ""),
        suicide_death_rate_year: asText(item.suicide_death_rate_year, ""),
      };
    } else if (result.apiId === "15099207" && result.status === "success") {
      data.koica_safety = {
        risklvl_cd: asText(item.risklvl_cd, ""),
        type: asText(item.type, ""),
        year: asText(item.year, ""),
        remark: asText(item.cn ?? item.remark, ""),
      };
    } else if (result.apiId === "15076233" && result.status === "success") {
      data.daily_risk = {
        report_dt: asText(item.report_dt, result.sourceUpdatedAt ?? ""),
        risklvl_cd: asText(item.risklvl_cd, ""),
        risklvl_cd_nm: asText(item.risklvl_cd_nm, ""),
        risk_cn: asText(item.risk_cn, ""),
        oldnewty_cd_nm: asText(item.oldnewty_cd_nm, ""),
      };
    } else if (result.apiId === "15076240" && result.status === "success") {
      data.risk_calendar = {
        icdt_cn: asText(item.icdt_cn, ""),
        icdt_occur_start_dt: asText(item.icdt_occur_start_dt, result.sourceUpdatedAt ?? ""),
        icdt_occur_end_dt: asText(item.icdt_occur_end_dt, ""),
        risklvl_cd: asText(item.risklvl_cd, ""),
        risklvl_cd_nm: asText(item.risklvl_cd_nm, ""),
      };
    } else if (result.apiId === "15099206" && result.status === "success") {
      data.local_life = {
        type: asText(item.type, ""),
        year: asText(item.year, ""),
        cn: asText(item.cn, ""),
      };
    } else if (result.apiId === "15099209" && result.status === "success") {
      data.local_activity = {
        type: asText(item.type, ""),
        year: asText(item.year, ""),
        cn: asText(item.cn, ""),
      };
    } else if (result.apiId === "15076249" && result.status === "success") {
      data.volunteer_safety_report = {
        safety_level: asText(item.safety_level, ""),
        safety_change_level: asText(item.safety_change_level, ""),
        year: asText(item.year, ""),
      };
    }
  }

  return data;
}

export function sanitizePublicDataText(value: unknown): string {
  if (typeof value !== "string") return value == null ? "" : String(value);
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function parseResponseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function extractItems(payload: unknown): Record<string, unknown>[] {
  const root = asRecord(payload);
  const body = asRecord(asRecord(root.response).body);
  const bodyItems = asRecord(body.items).item ?? body.items;
  const candidates = [root.data, root.items, bodyItems];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(asRecord);
    if (candidate && typeof candidate === "object") return [asRecord(candidate)];
  }
  return [];
}

function extractTotalCount(payload: unknown): number | undefined {
  const value =
    asRecord(payload).totalCount ??
    asRecord(asRecord(asRecord(payload).response).body).totalCount ??
    asRecord(payload).total_count;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function sanitizeItem(item: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(item).map(([key, value]) => [
      key,
      typeof value === "string" ? sanitizePublicDataText(value) : value,
    ]),
  );
}

function toEvidence(destinationId: string, result: PublicDataResult): ApiEvidence {
  return {
    id: `${destinationId}_${result.apiId}_${result.fetchedAt}`,
    tripId: "",
    destinationId,
    apiId: result.apiId,
    apiName: result.apiName,
    requestParams: result.requestParams,
    responseSnapshot: result.responseSnapshot,
    fetchedAt: result.fetchedAt,
    sourceUpdatedAt: result.sourceUpdatedAt,
  };
}

function parseAlarmLevel(value: unknown): 0 | 1 | 2 | 3 | 4 {
  const parsed = Number(value);
  if (parsed === 1 || parsed === 2 || parsed === 3 || parsed === 4) return parsed;
  return 0;
}

function asYn(value: unknown): "Y" | "N" {
  return value === "Y" ? "Y" : "N";
}

function asText(value: unknown, fallback: string): string {
  const text = sanitizePublicDataText(value);
  return text.length > 0 ? text : fallback;
}

function firstString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function findFirstString(payload: unknown, keys: string[]): string | undefined {
  const stack: unknown[] = [payload];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;
    const record = current as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" || typeof value === "number") return String(value);
    }
    stack.push(...Object.values(record));
  }
  return undefined;
}

function extractErrorMessage(payload: unknown, httpStatus: number): string {
  return (
    findFirstString(payload, ["resultMsg", "resultMessage", "message", "returnMsg"]) ??
    `HTTP ${httpStatus}`
  );
}

function hasAuthFailureText(payload: unknown): boolean {
  const root = asRecord(payload);
  const header = asRecord(asRecord(root.response).header);
  const candidates = [
    root.resultMsg,
    root.resultMessage,
    root.message,
    root.returnMsg,
    header.resultMsg,
    header.resultMessage,
    header.message,
    header.returnMsg,
  ];

  return candidates.some((value) => {
    if (typeof value !== "string" && typeof value !== "number") return false;
    const text = String(value).toUpperCase();
    return (
      text.includes("SERVICE KEY") ||
      text.includes("SERVICE_KEY") ||
      text.includes("UNAUTHORIZED") ||
      text.includes("인증키")
    );
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
