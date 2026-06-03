import { describe, expect, it } from "vitest";

import { getInitialGenerationDays } from "./itineraryUtils";

describe("itinerary generation window", () => {
  it("generates only one day initially regardless of trip duration", () => {
    expect(getInitialGenerationDays(1)).toBe(1);
    expect(getInitialGenerationDays(3)).toBe(1);
    expect(getInitialGenerationDays(10)).toBe(1);
  });
});
