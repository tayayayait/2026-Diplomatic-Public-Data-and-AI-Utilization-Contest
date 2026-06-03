export type RiskLevel = "LOW" | "WATCH" | "CAUTION" | "HIGH" | "BLOCKED" | "UNKNOWN";
export type TripUserType = "traveler" | "business" | "student" | "guardian";
export type TripPurpose = "tourism" | "business" | "study" | "volunteer" | "transit" | "unknown";
export type TripCompanions = "solo" | "family" | "group" | "unknown";

export type TripAnalysisState =
  | "idle"
  | "uploading"
  | "extracting"
  | "manual_ready"
  | "awaiting_confirmation"
  | "fetching_public_data"
  | "generating_report"
  | "ready"
  | "partial"
  | "failed";

export type ShareState = "private" | "link_active" | "expired" | "revoked";

export type ApiStatus =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "unauthorized"
  | "rate_limited"
  | "network_error"
  | "schema_error";

export interface Destination {
  id: string;
  tripId: string;
  countryNm: string;
  countryIsoAlp2: string;
  cities: string[];
  arrivalDate?: string;
  departureDate?: string;
}

export interface ApiEvidence {
  id: string;
  tripId: string;
  destinationId: string;
  apiId: string;
  apiName: string;
  requestParams: Record<string, string>;
  responseSnapshot: any;
  fetchedAt: string;
  sourceUpdatedAt?: string;
}

export interface EvidenceReference {
  evidenceApi: string;
  evidenceField: string;
  sourceUpdatedAt?: string;
}

export interface TravelAlarm {
  source_api_id?: "15095500" | "15076237";
  country_nm: string;
  country_iso_alp2: string;
  alarm_lvl: 0 | 1 | 2 | 3 | 4; // 0 none, 1 泥?깋, 2 ?⑹깋, 3 ?곸깋, 4 ?묒깋
  region_ty: string;
  remark: string;
  written_dt: string;
  dang_map_download_url?: string;
  flag_download_url?: string;
  map_download_url?: string;
}

export interface Embassy {
  embassy_kor_nm: string;
  embassy_addr: string;
  tel_no: string;
  urgency_tel_no: string;
  free_tel_no: string;
  center_tel_no?: string;
  embassy_lat?: string;
  embassy_lng?: string;
}

export interface LocalContact {
  country_nm: string;
  contact_remark: string;
  wrt_dt: string;
}

export interface VisaInfo {
  have_yn: "Y" | "N";
  gnrl_pspt_visa_yn: "Y" | "N";
  gnrl_pspt_visa_cn: string;
  nvisa_entry_evdc_cn: string;
  remark: string;
}

export interface MedicalInfo {
  current_travel_alarm: string;
  clean_water_use_rate: string;
  tuber_pr_hndrd_thsnd_ppl_outbreak_rate: string;
  clean_water_use_rate_year?: string;
  tuber_pr_hndrd_thsnd_ppl_outbreak_rate_year?: string;
}

export interface SecurityInfo {
  current_travel_alarm: string;
  unemployment_rate: string;
  suicide_death_rate?: string;
  unemployment_rate_year?: string;
  suicide_death_rate_year?: string;
}

export interface AccidentInfo {
  current_travel_alarm?: string;
  remark?: string;
  wrt_dt?: string;
}

export interface KoicaSafetyInfo {
  risklvl_cd?: string;
  type?: string;
  year?: string;
  remark?: string;
}

export interface DailyRiskInfo {
  report_dt?: string;
  risklvl_cd?: string;
  risklvl_cd_nm?: string;
  risk_cn?: string;
  oldnewty_cd_nm?: string;
}

export interface RiskCalendarInfo {
  icdt_cn?: string;
  icdt_occur_start_dt?: string;
  icdt_occur_end_dt?: string;
  risklvl_cd?: string;
  risklvl_cd_nm?: string;
}

export interface KoicaLocalInfo {
  type?: string;
  year?: string;
  cn?: string;
}

export interface VolunteerSafetyReportInfo {
  safety_level?: string;
  safety_change_level?: string;
  year?: string;
}

export interface CountryPublicData {
  travel_alarm?: TravelAlarm;
  embassy?: Embassy;
  local_contact?: LocalContact;
  visa?: VisaInfo;
  medical?: MedicalInfo;
  security?: SecurityInfo;
  accident?: AccidentInfo;
  koica_safety?: KoicaSafetyInfo;
  daily_risk?: DailyRiskInfo;
  risk_calendar?: RiskCalendarInfo;
  local_life?: KoicaLocalInfo;
  local_activity?: KoicaLocalInfo;
  volunteer_safety_report?: VolunteerSafetyReportInfo;
  apiStatuses: Record<string, ApiStatus>;
  evidences?: ApiEvidence[];
}

export type LocalPlaceCategory = "hospital" | "pharmacy" | "police";
export type LocalPlaceSource = "google_places" | "maps_search";
export type LocalPlacesStatus = "success" | "partial" | "empty" | "missing_api_key" | "failed";

export interface LocalPlace {
  id: string;
  category: LocalPlaceCategory;
  name: string;
  address?: string;
  phone?: string;
  rating?: number;
  googleMapsUri: string;
  source: LocalPlaceSource;
}

export interface DestinationLocalPlaces {
  destinationId: string;
  countryIsoAlp2: string;
  countryNm: string;
  city: string;
  status: LocalPlacesStatus;
  fetchedAt: string;
  places: LocalPlace[];
  notices?: string[];
}

export type WeatherForecastStatus =
  | "success"
  | "partial"
  | "out_of_range"
  | "geocode_empty"
  | "failed";
export type WeatherForecastSource = "open_meteo";

export interface WeatherForecastDay {
  date: string;
  weatherCode?: number;
  weatherLabel: string;
  tempMinC?: number;
  tempMaxC?: number;
  precipitationMm?: number;
  precipitationProbabilityMax?: number;
  windSpeedKmhMax?: number;
  uvIndexMax?: number;
}

export interface DestinationWeatherForecast {
  destinationId: string;
  countryIsoAlp2: string;
  countryNm: string;
  city: string;
  status: WeatherForecastStatus;
  source: WeatherForecastSource;
  fetchedAt: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  riskLevel: RiskLevel;
  summary: string;
  days: WeatherForecastDay[];
  notices?: string[];
}

export interface RiskProfile {
  tripId: string;
  destinationId: string;
  score: number | null;
  level: RiskLevel;
  summary: string;
  topRisks: Array<{
    title: string;
    severity: "low" | "medium" | "high";
    action: string;
    evidenceApi: string;
    evidenceField: string;
  }>;
}

export type RiskAssessment = RiskProfile;

export interface ChecklistItem {
  id: string;
  category: "departure_14_days" | "departure_7_days" | "departure_1_day" | "today" | "during_stay";
  label: string;
  required: boolean;
  done: boolean;
  evidence?: EvidenceReference;
  isCustom?: boolean;
}

export interface EmergencyCard {
  primary_contact: string;
  phrases: Array<{ ko: string; en: string; local?: string }>;
  action_steps: string[];
}

export interface Trip {
  id: string;
  title: string;
  userType: TripUserType;
  purpose: TripPurpose;
  companions: TripCompanions;
  vulnerabilities?: string[];
  departureDate: string;
  returnDate?: string;
  analysisState: TripAnalysisState;
  shareState: ShareState;
  destinations: Destination[];
  createdAt: string;
  updatedAt: string;
  publicData?: Record<string, CountryPublicData>; // by ISO2
  risk?: RiskAssessment;
  riskProfiles?: RiskProfile[];
  summary?: string;
  checklist?: ChecklistItem[];
  emergency?: EmergencyCard;
  unknowns?: string[];
  memo?: string;
  localPlaces?: Record<string, DestinationLocalPlaces>;
  weatherForecasts?: Record<string, DestinationWeatherForecast>;
}

export type PublicDataRequest = {
  apiId: string;
  countryNm?: string;
  countryIsoAlp2?: string;
  page?: number;
  perPage?: number;
  year?: string;
  type?: string;
};

export type PublicDataResult<T = Record<string, unknown>> = {
  ok: boolean;
  apiId: string;
  apiName: string;
  status: ApiStatus;
  items: T[];
  totalCount?: number;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  requestParams: Record<string, string>;
  responseSnapshot: any;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
};
