import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routesDir = fileURLToPath(new URL("../../routes", import.meta.url));
const routePath = (file: string) => join(routesDir, file);

const routeFiles = () => readdirSync(routesDir).filter((file) => file.endsWith(".tsx")).sort();
const routeSource = (file: string) => readFileSync(routePath(file), "utf8");

describe("DiploLife route structure", () => {
  it("exposes the ?곸꽭??md target route files", () => {
    expect(routeFiles()).toEqual(
      expect.arrayContaining([
        "__root.tsx",
        "index.tsx",
        "onboarding.tsx",
        "dashboard.tsx",
        "chat.tsx",
        "sos.tsx",
        "cost.tsx",
        "settings.tsx",
        "safety.tsx",
        "visa.tsx",
        "notices.tsx",
      ]),
    );
  });

  it("removes SafeRoute trip and guardian-share user routes", () => {
    const removedRoutes = [
      "share.$shareId.tsx",
      "trips.index.tsx",
      "trips.new.tsx",
      "trips.$tripId.analyzing.tsx",
      "trips.$tripId.checklist.tsx",
      "trips.$tripId.confirm.tsx",
      "trips.$tripId.countries.$countryIso2.tsx",
      "trips.$tripId.dashboard.tsx",
      "trips.$tripId.emergency.tsx",
    ];

    for (const file of removedRoutes) {
      expect(existsSync(routePath(file))).toBe(false);
    }
  });

  it("keeps public route sources free of SafeRoute and /trips navigation", () => {
    const publicRouteFiles = [
      "index.tsx",
      "onboarding.tsx",
      "dashboard.tsx",
      "chat.tsx",
      "sos.tsx",
      "cost.tsx",
      "settings.tsx",
      "safety.tsx",
      "visa.tsx",
      "notices.tsx",
    ];

    for (const file of publicRouteFiles) {
      const source = routeSource(file);
      expect(source).not.toMatch(/SafeRoute|saferoute/i);
      expect(source).not.toContain("/trips");
      expect(source).not.toContain("/share");
    }
  });

  it("keeps the safety detail route organized for quick user scanning", () => {
    const source = routeSource("safety.tsx");

    expect(source).toContain('title="?꾩? ?덉쟾 ?곸꽭"');
    expect(source).toContain("?듭떖 ?붿빟");
    expect(source).toContain("?먮Ц ?꾩껜 蹂닿린");
    expect(source).toContain("?곸궗肄쒖꽱??24?쒓컙");
    expect(source).toContain("?꾪솕 媛?ν븳 ?곕씫泥섎? ?곗꽑 諛곗튂?덉뒿?덈떎.");
  });
});
