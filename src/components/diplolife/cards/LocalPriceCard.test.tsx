import { describe, expect, it } from "vitest";
import { createCountryCostFallbackRows } from "./LocalPriceCard";

const countryCost = {
  data: {
    breakdown: {
      groceries: { note: "Basic groceries for one person", usd: 400 },
      rent: { note: "1-bedroom apartment, city average", usd: 600 },
      transport: { note: "Public transport + occasional taxi", usd: 250 },
    },
    costIndex: 82,
    monthlyEstimate: {
      couple: 4650,
      currency: "USD",
      singlePerson: 3000,
    },
    mostAffordableCities: [],
    usComparison: "on par with the United States",
  },
  entity: { code: "US", name: "United States" },
  sources: ["WhereNext"],
  summary: "Living in United States costs an estimated $3,000/month.",
};

describe("LocalPriceCard", () => {
  it("creates country cost rows in local currency with KRW conversion", () => {
    const rows = createCountryCostFallbackRows(countryCost, {
      localCurrency: "USD",
      localCurrencyKrwRate: 1400,
      usdToKrwRate: 1400,
    });

    expect(rows).toEqual([
      {
        key: "rent",
        krwAmount: 840000,
        label: "?붿꽭",
        localAmount: 600,
        localCurrency: "USD",
        note: "1-bedroom apartment, city average",
        sourceUsdAmount: 600,
      },
      {
        key: "groceries",
        krwAmount: 560000,
        label: "?앸즺??",
        localAmount: 400,
        localCurrency: "USD",
        note: "Basic groceries for one person",
        sourceUsdAmount: 400,
      },
      {
        key: "transport",
        krwAmount: 350000,
        label: "援먰넻",
        localAmount: 250,
        localCurrency: "USD",
        note: "Public transport + occasional taxi",
        sourceUsdAmount: 250,
      },
    ]);
  });

  it("converts USD country-cost data to non-USD local currency through KRW", () => {
    const rows = createCountryCostFallbackRows(countryCost, {
      localCurrency: "CAD",
      localCurrencyKrwRate: 1000,
      usdToKrwRate: 1400,
    });

    expect(rows[0]).toMatchObject({
      key: "rent",
      krwAmount: 840000,
      localAmount: 840,
      localCurrency: "CAD",
      sourceUsdAmount: 600,
    });
  });
});
