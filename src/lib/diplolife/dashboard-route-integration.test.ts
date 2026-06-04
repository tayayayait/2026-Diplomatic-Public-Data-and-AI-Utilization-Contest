import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = fileURLToPath(new URL("../..", import.meta.url));
const routeSource = (file: string) => readFileSync(join(srcDir, "routes", file), "utf8");

describe("DiploLife dashboard route integration", () => {
  it("renders dashboard cards through the Phase 5 presenter", () => {
    const source = routeSource("dashboard.tsx");

    expect(source).toContain('from "@/lib/diplolife/dashboard"');
    expect(source).toContain("createDashboardViewModel");
    expect(source).not.toContain("const cards = [");
  });

  it("does not pass an object-creating presenter directly as a Zustand selector", () => {
    const source = routeSource("dashboard.tsx");

    expect(source).not.toContain("useDiploLifeStore(createDashboardViewModel)");
  });
});
