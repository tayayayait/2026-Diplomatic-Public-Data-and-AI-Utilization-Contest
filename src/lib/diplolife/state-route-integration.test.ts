import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = fileURLToPath(new URL("../..", import.meta.url));
const routeSource = (file: string) => readFileSync(join(srcDir, "routes", file), "utf8");

describe("DiploLife state route integration", () => {
  it("connects core routes to the DiploLife state store", () => {
    for (const file of ["onboarding.tsx", "dashboard.tsx", "chat.tsx", "sos.tsx", "cost.tsx"]) {
      expect(routeSource(file)).toContain('from "@/lib/diplolife/state"');
      expect(routeSource(file)).toContain("useDiploLifeStore");
    }
  });

  it("keeps route sources free of Trip state imports", () => {
    for (const file of ["onboarding.tsx", "dashboard.tsx", "chat.tsx", "sos.tsx", "cost.tsx"]) {
      const source = routeSource(file);
      expect(source).not.toContain("@/lib/saferoute/trip-store");
      expect(source).not.toContain("@/lib/saferoute/types");
      expect(source).not.toMatch(/\bTrip\b/);
    }
  });
});
