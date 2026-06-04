import { getGenAIClient } from "./gemini";
import type { StayPurpose } from "../state";
import type { CityPriceItem, CountryCostOfLiving } from "./wherenext";

export type CostPreset = "saving" | "standard" | "flexible";

export interface CostDistribution {
  housing: number;
  food: number;
  transport: number;
  telecom: number;
  other: number;
}

export interface CityCostData {
  name: string;
  desc: string;
  monthlyAvgKrw: number;
}

export interface CostEstimationResult {
  presets: Record<CostPreset, CostDistribution>;
  cities: CityCostData[];
}

export async function estimateLivingCost(
  country: string,
  city?: string,
): Promise<CostEstimationResult | null> {
  const ai = getGenAIClient();
  const targetLocation = city ? `${country} ${city}` : country;
  const prompt = `
Estimate living-cost presets for ${targetLocation}.

Return only JSON:
{
  "presets": {
    "saving": { "housing": 50, "food": 25, "transport": 10, "telecom": 5, "other": 10 },
    "standard": { "housing": 45, "food": 25, "transport": 10, "telecom": 5, "other": 15 },
    "flexible": { "housing": 40, "food": 25, "transport": 15, "telecom": 5, "other": 15 }
  },
  "cities": [
    { "name": "City", "monthlyAvgKrw": 2500000, "desc": "Average 2,500,000 KRW/month" }
  ]
}

Rules:
- Each preset distribution must add up to 100.
- Include 3 or 4 major cities when possible.
- Use KRW numbers for monthlyAvgKrw.
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;
    if (!responseText) return null;

    return JSON.parse(responseText) as CostEstimationResult;
  } catch (error) {
    console.error("Gemini cost estimation failed:", error);
    return null;
  }
}

export interface CostAnalysisContext {
  cityPrices?: CityPriceItem[];
  countryCost?: CountryCostOfLiving;
  userProfile: {
    stayPurpose: StayPurpose;
    stayDays: number;
    totalBudgetKrw: number;
    city?: string;
    country: string;
  };
  exchangeRate: number;
  targetCurrency: string;
}

export interface CostAnalysisResult {
  dailyBudget: {
    food: number;
    transport: number;
    accommodation: number;
    activity: number;
    total: number;
  };
  budgetComment: string;
  savingTips: string[];
  recommendations: {
    category: string;
    title: string;
    description: string;
    estimatedSaving: string;
  }[];
}

export async function analyzeLivingCost(
  context: CostAnalysisContext,
): Promise<CostAnalysisResult | null> {
  const ai = getGenAIClient();
  const pricesText =
    context.cityPrices && context.cityPrices.length > 0
      ? JSON.stringify(context.cityPrices, null, 2)
      : "No city-level price data.";
  const countryCostText = context.countryCost
    ? JSON.stringify(
        {
          breakdown: context.countryCost.data.breakdown,
          costIndex: context.countryCost.data.costIndex,
          monthlyEstimate: context.countryCost.data.monthlyEstimate,
        },
        null,
        2,
      )
    : "No country-level cost data.";
  const totalLocalCurrency =
    context.exchangeRate > 0
      ? Math.round(context.userProfile.totalBudgetKrw / context.exchangeRate)
      : context.userProfile.totalBudgetKrw;

  const systemInstruction = `
당신은 현지 생활비 분석 전문가입니다. 제공된 WhereNext 데이터를 바탕으로 분석하세요.
구체적인 일일 예산 카테고리와 현지에서 실천 가능한 절약 방법을 제안하세요.
budgetComment는 기존처럼 예산 수치(총액, 일일 예산 등)를 반복해서 설명하는 것을 절대 금지합니다. 대신, 주어진 예산을 활용하기 위해 여행객에게 실질적으로 도움이 되는 현지 맞춤형 꿀팁 2~3가지를 글머리 기호(•)와 줄바꿈(\\n)을 사용하여 명확하게 작성하세요.
특히 절약 팁(recommendations)은 반드시 현지인이 아니면 모르는 꿀팁으로, 실질적으로 도움되는 현실적인 내용만 정확히 3가지를 다양한 카테고리(예: 식비, 교통, 쇼핑 등)로 선정하여 제안하세요. 뻔한 내용은 절대 금지합니다.
반드시 JSON 형식으로만 반환하세요.
중요: 모든 텍스트 필드(budgetComment, savingTips, title, description, estimatedSaving)는 반드시 "한국어(Korean)"로 작성하세요. 영어로 응답하지 마세요.
`;

  const prompt = `
User context:
- Country: ${context.userProfile.country}
- City: ${context.userProfile.city || "unknown"}
- Stay purpose: ${context.userProfile.stayPurpose}
- Stay days: ${context.userProfile.stayDays}
- Total budget: ${context.userProfile.totalBudgetKrw.toLocaleString("ko-KR")} KRW
- Local budget estimate: ${totalLocalCurrency.toLocaleString("ko-KR")} ${context.targetCurrency}
- Exchange rate: 1 ${context.targetCurrency} = ${context.exchangeRate} KRW

City price data:
${pricesText}

Country cost data:
${countryCostText}

Return only JSON. ALL string values (budgetComment, savingTips, title, description, estimatedSaving) MUST BE IN KOREAN (한국어). Do NOT use English for text values.
Ensure "recommendations" contains EXACTLY 3 items representing distinct practical local tips.
{
  "dailyBudget": {
    "food": 5000,
    "transport": 1000,
    "accommodation": 8000,
    "activity": 2000,
    "total": 16000
  },
  "budgetComment": "예산 계산(총액, 일일 예산) 나열은 절대 금지합니다. 대신 실질적인 현지 맞춤형 꿀팁 2~3가지를 글머리 기호(•)를 사용하여 작성하세요. 예: • 식비 절약 팁... \\n• 교통비 절약 팁...",
  "savingTips": ["구체적인 절약 팁 (반드시 한국어로 작성)", "교통비 절약 방법 (반드시 한국어로 작성)"],
  "recommendations": [
    {
      "category": "food",
      "title": "관광지 식당 피하고 현지인 추천 골목 식당 이용",
      "description": "관광지 중심가보다 2블록 이상 떨어진 곳이 30% 이상 저렴합니다. 현지 직장인들이 자주 가는 백반집이나 로컬 체인을 활용하세요.",
      "estimatedSaving": "식비 30% 절감"
    },
    {
      "category": "transport",
      "title": "현지 교통카드와 1일권 조합",
      "description": "매번 표를 끊는 것보다 로컬 전용 패스나 정기권을 이용하세요. 특정 시간대나 노선에서 할인이 적용되는 패스가 유리합니다.",
      "estimatedSaving": "교통비 약 20% 절약"
    },
    {
      "category": "activity",
      "title": "현지 슈퍼마켓 마감 세일 공략",
      "description": "편의점보다는 대형 마트를 이용하고, 폐점 1~2시간 전(주로 저녁 8시 이후) 할인 스티커가 붙는 도시락과 신선식품을 노리세요.",
      "estimatedSaving": "식재료비 50% 절약"
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text;
    if (!responseText) return null;

    return JSON.parse(responseText) as CostAnalysisResult;
  } catch (error) {
    console.error("Gemini cost analysis failed:", error);
    return null;
  }
}
