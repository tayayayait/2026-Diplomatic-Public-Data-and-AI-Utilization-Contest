import { describe, expect, it } from "vitest";
import { getWhereNextCityKey, selectCityPriceIndexEntry } from "./wherenext";

const cityPriceIndex = [
  {
    categories: 8,
    city_key: "JP-Tokyo",
    city_name: "Tokyo",
    country_code: "jp",
    currency: "JPY",
    item_count: 29,
  },
  {
    categories: 7,
    city_key: "JP-Osaka",
    city_name: "Osaka",
    country_code: "jp",
    currency: "JPY",
    item_count: 23,
  },
  {
    categories: 8,
    city_key: "FR-Paris",
    city_name: "Paris",
    country_code: "fr",
    currency: "EUR",
    item_count: 32,
  },
];

describe("WhereNext city key mapping", () => {
  it("accepts English city names stored by location search", () => {
    expect(getWhereNextCityKey("GB", "London")).toBe("GB-London");
    expect(getWhereNextCityKey("JP", "Tokyo")).toBe("JP-Tokyo");
  });

  it("normalizes whitespace and case for city names", () => {
    expect(getWhereNextCityKey("gb", " london ")).toBe("GB-London");
    expect(getWhereNextCityKey("jp", "TOKYO")).toBe("JP-Tokyo");
  });

  it("selects an exact supported city from the official city-price index", () => {
    expect(selectCityPriceIndexEntry("FR", "Paris", cityPriceIndex)?.city_key).toBe("FR-Paris");
  });

  it("falls back to the most complete city in the same country when the selected city is unsupported", () => {
    expect(selectCityPriceIndexEntry("JP", "Kyoto", cityPriceIndex)?.city_key).toBe("JP-Tokyo");
  });

  it("returns null when the official city-price index has no city for the country", () => {
    expect(selectCityPriceIndexEntry("US", "New York", cityPriceIndex)).toBeNull();
  });
});
