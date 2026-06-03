import { describe, expect, it } from "vitest";

import {
  createItineraryBudgetPlan,
  formatBudgetPlanForPrompt,
  getGoogleTextSearchPriceLevelsForStrategy,
  resolveEffectiveItineraryBudgetStrategy,
  resolveBudgetStrategy,
} from "./budget-plan";

describe("itinerary budget plan", () => {
  it("turns a total trip budget into a daily itinerary budget plan", () => {
    const plan = createItineraryBudgetPlan({
      budgetStrategy: "balanced",
      costAnalysis: null,
      exchangeRate: { fromCurrency: "JPY", rate: 11 },
      profile: {
        stayPurpose: "TRAVEL",
        stayStartDate: "2026-06-05",
        stayEndDate: "2026-06-16",
      },
      totalBudgetKrw: 800000,
    });

    expect(plan).toMatchObject({
      dailyBudgetKrw: 72727,
      dailyLocalBudget: {
        accommodation: 2314,
        activity: 1322,
        food: 1984,
        total: 6612,
        transport: 992,
      },
      exchangeRateKrwPerLocal: 11,
      stayDays: 11,
      strategy: "balanced",
      targetCurrency: "JPY",
      totalBudgetKrw: 800000,
    });
  });

  it("prefers analyzed local daily budget when living-cost analysis exists", () => {
    const plan = createItineraryBudgetPlan({
      budgetStrategy: "saving",
      costAnalysis: {
        dailyBudget: {
          accommodation: 3800,
          activity: 659,
          food: 2500,
          total: 7660,
          transport: 700,
        },
      },
      exchangeRate: { fromCurrency: "JPY", rate: 10.45 },
      profile: {
        stayPurpose: "TRAVEL",
        stayStartDate: "2026-06-05",
        stayEndDate: "2026-06-16",
      },
      totalBudgetKrw: 800000,
    });

    expect(plan.dailyLocalBudget).toEqual({
      accommodation: 3800,
      activity: 659,
      food: 2500,
      total: 7660,
      transport: 700,
    });
    expect(formatBudgetPlanForPrompt(plan)).toContain("珥?800,000??)";
    expect(formatBudgetPlanForPrompt(plan)).toContain("?꾨왂 ?덉빟 ?곗꽑");
  });

  it("does not turn budget strategy into Google Text Search price-level hard filters", () => {
    expect(getGoogleTextSearchPriceLevelsForStrategy("saving")).toEqual([]);
    expect(getGoogleTextSearchPriceLevelsForStrategy("balanced")).toEqual([]);
    expect(getGoogleTextSearchPriceLevelsForStrategy("experience")).toEqual([]);
  });

  it("keeps the user-selected budget strategy regardless of daily budget amount", () => {
    expect(
      resolveEffectiveItineraryBudgetStrategy({
        dailyBudgetKrw: 50000,
        strategy: "balanced",
      }),
    ).toBe("balanced");
    expect(
      resolveEffectiveItineraryBudgetStrategy({
        dailyBudgetKrw: 300000,
        strategy: "balanced",
      }),
    ).toBe("balanced");
    expect(
      resolveEffectiveItineraryBudgetStrategy({
        dailyBudgetKrw: 300000,
        strategy: "saving",
      }),
    ).toBe("saving");
  });

  it("falls back from legacy budget labels to a budget strategy", () => {
    expect(resolveBudgetStrategy({ strategy: "experience" }, "???)).toBe("experience")";
    expect(resolveBudgetStrategy(undefined, "???)).toBe("saving")";
    expect(resolveBudgetStrategy(undefined, "800,000???섏?")).toBe("balanced");
    expect(resolveBudgetStrategy(undefined, "?ъ쑀")).toBe("experience");
  });
});
