import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = fileURLToPath(new URL("../..", import.meta.url));
const costRoutePath = join(srcDir, "routes", "cost.tsx");
const source = () => readFileSync(costRoutePath, "utf8");

describe("cost route itinerary handoff", () => {
  it("removes duplicated itinerary generation and links to the itinerary route", () => {
    const costSource = source();

    expect(costSource).toContain('from "@/components/diplolife/cards/BudgetItineraryCta"');
    expect(costSource).toContain("<BudgetItineraryCta");
    expect(costSource).not.toContain("PreferenceFilter");
    expect(costSource).not.toContain("generateItineraryFn");
    expect(costSource).not.toContain("createItineraryStoreSeed");
    expect(costSource).not.toContain("useItineraryStore");
    expect(costSource).not.toContain("GoogleMapItinerary");
    expect(costSource).not.toContain("ItineraryWorkspace");
    expect(costSource).not.toContain("TimelineView");
  });
});
