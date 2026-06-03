import { describe, expect, it } from "vitest";
import { normalizeDepartureLocation } from "./departure-location";

describe("departure location", () => {
  it("uses the user-entered departure point for itinerary generation", () => {
    expect(normalizeDepartureLocation("  Brook St, London W1K 4HR ?곴뎅  ")).toBe(
      "Brook St, London W1K 4HR ?곴뎅",
    );
  });

  it("does not fall back to a previously saved accommodation when the input is cleared", () => {
    expect(normalizeDepartureLocation("   ")).toBeUndefined();
    expect(normalizeDepartureLocation(undefined)).toBeUndefined();
  });
});
