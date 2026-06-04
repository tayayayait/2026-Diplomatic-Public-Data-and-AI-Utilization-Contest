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

import { getGenAIClient } from "./gemini";

const WHERENEXT_BASE_URL = "https://getwherenext.com/api/data"; // Legacy fallback if needed

export const fetchCityPrices = createServerFn({ method: "GET" })
  .inputValidator(z.object({ countryCode: z.string(), cityName: z.string().optional() }))
  .handler(async ({ data: { countryCode, cityName } }): Promise<CityPriceData | null> => {
    const targetCity = cityName || "Major City/Capital";
    try {
      const ai = getGenAIClient();
      const prompt = `
Provide realistic city prices for ${targetCity}, ${countryCode}.
Return ONLY valid JSON. Do not include markdown formatting or extra text.
{
  "metadata": {
    "city": "${countryCode}-${targetCity}",
    "currency": "Local Currency",
    "exchange_rate": 1.0,
    "data_source": "Gemini AI Live Data"
  },
  "data": [
    { "category": "숙박", "item": "3~4성급 호텔 (1박)", "price_usd": 120.0, "price_local": 0 },
    { "category": "숙박", "item": "에어비앤비 원룸 (1박)", "price_usd": 80.0, "price_local": 0 },
    { "category": "외식 및 카페", "item": "로컬 식당 한 끼 (현지식)", "price_usd": 8.0, "price_local": 0 },
    { "category": "외식 및 카페", "item": "아메리카노/카푸치노 한 잔", "price_usd": 4.0, "price_local": 0 },
    { "category": "외식 및 카페", "item": "맥도날드 등 패스트푸드 세트", "price_usd": 7.0, "price_local": 0 },
    { "category": "마트 및 생필품", "item": "생수 (1.5L) 1병", "price_usd": 1.0, "price_local": 0 },
    { "category": "마트 및 생필품", "item": "로컬 맥주 (500ml) 1캔", "price_usd": 2.0, "price_local": 0 },
    { "category": "교통비", "item": "대중교통 1일 무제한 패스", "price_usd": 6.0, "price_local": 0 },
    { "category": "교통비", "item": "공항-시내 간 택시/우버", "price_usd": 30.0, "price_local": 0 },
    { "category": "통신비", "item": "선불 유심 (데이터 10GB)", "price_usd": 15.0, "price_local": 0 }
  ]
}
Instructions: Fill in 'price_local' for all items using the realistic local currency price for travelers. Ensure the JSON is properly formatted.
`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" },
      });
      const responseText = response.text;
      if (!responseText) return null;
      return JSON.parse(responseText) as CityPriceData;
    } catch (err) {
      console.error("fetchCityPrices error:", err);
      return null;
    }
  });

export const fetchCountryCostOfLiving = createServerFn({ method: "GET" })
  .inputValidator(z.object({ countryCode: z.string() }))
  .handler(async ({ data: { countryCode } }): Promise<CountryCostOfLiving | null> => {
    try {
      const ai = getGenAIClient();
      const prompt = `
Provide realistic country cost of living overview for country code: ${countryCode}.
Return ONLY valid JSON. Do not include markdown formatting or extra text.
{
  "entity": { "code": "${countryCode}", "name": "Country Name" },
  "data": {
    "costIndex": 85,
    "usComparison": "미국보다 약 15% 저렴함",
    "monthlyEstimate": {
      "singlePerson": 1500,
      "couple": 2800,
      "currency": "USD",
      "note": "월세 불포함 생활비 기준"
    },
    "breakdown": {
      "rent": { "usd": 950, "note": "도심 1베드룸 월세 평균" },
      "groceries": { "usd": 350, "note": "1인당 월평균 식료품비" },
      "transport": { "usd": 120, "note": "대중교통 정기권 및 기본 이동비" }
    },
    "mostAffordableCities": [
      { "name": "가장 저렴한 도시 1", "estimatedMonthlyCostUsd": 900, "costIndex": 65 },
      { "name": "가장 저렴한 도시 2", "estimatedMonthlyCostUsd": 1100, "costIndex": 72 }
    ]
  },
  "summary": "해당 국가의 전반적인 물가 및 생활비 수준에 대한 요약 설명입니다. (한국어로 작성)",
  "sources": ["Gemini AI Live Data"]
}
`;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" },
      });
      const responseText = response.text;
      if (!responseText) return null;
      return JSON.parse(responseText) as CountryCostOfLiving;
    } catch (err) {
      console.error("fetchCountryCostOfLiving error:", err);
      return null;
    }
  });

