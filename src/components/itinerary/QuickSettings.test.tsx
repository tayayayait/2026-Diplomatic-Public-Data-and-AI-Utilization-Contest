import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { QuickSettings, type QuickSettingsValues } from "./QuickSettings";

const values: QuickSettingsValues = {
  budget: "Balanced",
  budgetStrategy: "balanced",
  itineraryIntensity: "normal",
  startTime: "09:00",
  travelModes: ["WALK", "TRANSIT"],
};

describe("QuickSettings", () => {
  it("renders start time and itinerary intensity controls in the expanded detail settings", () => {
    const markup = renderToStaticMarkup(
      <QuickSettings defaultOpen values={values} onChange={() => undefined} />,
    );

    expect(markup).toContain("Detail itinerary settings");
    expect(markup).toContain("Start time");
    expect(markup).toContain("Itinerary intensity");
    expect(markup).toContain("Relaxed");
    expect(markup).toContain("3 places");
    expect(markup).toContain("Normal");
    expect(markup).toContain("5 places");
    expect(markup).toContain("Packed");
    expect(markup).toContain("7 places");
    expect(markup).not.toContain("Travel modes");
  });
});
