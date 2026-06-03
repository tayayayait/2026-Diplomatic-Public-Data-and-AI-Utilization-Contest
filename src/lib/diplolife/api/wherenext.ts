import { CITY_KEY_MAP } from "../cost-translations";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** /api/data/city-prices ?묐떟 */
export interface CityPriceData {
  metadata: {
    city: string;       // "JP-Tokyo"
    currency: string;   // "JPY"
    exchange_rate: number; // WhereNext 湲곗? ?섏쑉 (李멸퀬??
    data_source: string;
  };
  data: CityPriceItem[];
}

export interface CityPriceItem {
  category: "Groceries" | "Restaurants & Cafes" | "Housing"
    | "Transport" | "Utilities & Internet" | "Clothing"
    | "Leisure & Fitness" | "Personal Care" | string;
  item: string;        // "Ramen bowl"
  price_usd: number;   // 6
  price_local: number;  // 900
}

/** /api/data/ai-cost-of-living/{code} ?묐떟 */
export interface CountryCostOfLiving {
  entity: { code: string; name: string };
  data: {
    costIndex: number;         // 74 (US=82, World=100)
    usComparison: string;      // "approximately 10% cheaper than the US"
    monthlyEstimate: {
      singlePerson: number;    // USD
      couple: number;
      currency: string;
      note?: string;
    };
    breakdown: Record<string, { usd: number; note: string }>;
    mostAffordableCities: { name: string; estimatedMonthlyCostUsd: number; costIndex: number }[];
  };
  summary: string;
  sources: string[];
}

/**
 * ?꾩떆 ??蹂??濡쒖쭅
 * ?⑤낫?⑹뿉???섏쭛??ISO2? ?쒓? ?꾩떆紐낆쓣 WhereNext ?뺤떇(?? JP-Tokyo)?쇰줈 蹂?섑빀?덈떎.
 */
export function getWhereNextCityKey(countryCode: string, cityName?: string): string | null {
  if (!cityName) return null;
  const iso2 = countryCode.toUpperCase();
  const cityMap = CITY_KEY_MAP[iso2];
  if (cityMap && cityMap[cityName]) {
    return cityMap[cityName];
  }
  // 留ㅽ븨???놁쑝硫??곷Ц?쇰줈 ?쒕룄 (?댁감???꾩쓽 ?낅젰?????덉쓬)
  return null;
}

const WHERENEXT_BASE_URL = "https://getwherenext.com/api/data";

async function fetchWithTimeout(url: string, timeoutMs = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(id);
  return response;
}

/** ?꾩떆蹂??덈ぉ 媛寃?議고쉶 */
export const fetchCityPrices = createServerFn({ method: "GET" })
  .inputValidator(z.object({ countryCode: z.string(), cityName: z.string().optional() }))
  .handler(async ({ data: { countryCode, cityName } }): Promise<CityPriceData | null> => {
    const cityKey = getWhereNextCityKey(countryCode, cityName);
    if (!cityKey) return null;

    try {
      const url = `${WHERENEXT_BASE_URL}/city-prices?city=${cityKey}`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) return null;
      return await response.json() as CityPriceData;
    } catch (err) {
      console.error("fetchCityPrices error:", err);
      return null;
    }
  });

/** 援?? ?앺솢鍮?媛쒖슂 議고쉶 */
export const fetchCountryCostOfLiving = createServerFn({ method: "GET" })
  .inputValidator(z.object({ countryCode: z.string() }))
  .handler(async ({ data: { countryCode } }): Promise<CountryCostOfLiving | null> => {
    try {
      const code = countryCode.toLowerCase();
      const url = `${WHERENEXT_BASE_URL}/ai-cost-of-living/${code}`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) return null;
      return await response.json() as CountryCostOfLiving;
    } catch (err) {
      console.error("fetchCountryCostOfLiving error:", err);
      return null;
    }
  });

