import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BudgetItineraryCta } from "./BudgetItineraryCta";

describe("BudgetItineraryCta", () => {
  it("links budget users to the dedicated itinerary screen", () => {
    const markup = renderToStaticMarkup(
      <BudgetItineraryCta destinationLabel="Fukuoka" totalBudgetKrw={800000} />,
    );

    expect(markup).toContain('href="/itinerary?budgetKrw=800000"');
    expect(markup).toContain("Fukuoka");
    expect(markup).toContain("800,000 KRW");
  });
});
