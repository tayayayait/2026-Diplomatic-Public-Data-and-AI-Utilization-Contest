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

    expect(markup).toContain("상세 일정 설정");
    expect(markup).toContain("시작 시간");
    expect(markup).toContain("일정 강도");
    expect(markup).toContain("여유롭게");
    expect(markup).toContain("3곳");
    expect(markup).toContain("보통");
    expect(markup).toContain("5곳");
    expect(markup).toContain("알차게");
    expect(markup).toContain("7곳");
    expect(markup).not.toContain("Travel modes");
  });
});
