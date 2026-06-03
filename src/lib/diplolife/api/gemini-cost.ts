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
You are a local living-cost analyst. Use the supplied WhereNext data as the evidence base.
Return practical advice with concrete daily-budget categories and local saving actions.
Return JSON only.
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

Return only JSON:
{
  "dailyBudget": {
    "food": 5000,
    "transport": 1000,
    "accommodation": 8000,
    "activity": 2000,
    "total": 16000
  },
  "budgetComment": "Concise budget judgment.",
  "savingTips": ["Concrete tip"],
  "recommendations": [
    {
      "category": "food",
      "title": "Recommendation title",
      "description": "Specific local guidance.",
      "estimatedSaving": "Estimated saving"
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
