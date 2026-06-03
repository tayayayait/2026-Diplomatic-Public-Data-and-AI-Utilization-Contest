import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = fileURLToPath(new URL("..", import.meta.url));
const settingsPath = join(srcDir, "routes", "settings.tsx");

describe("settings route profile actions", () => {
  it("offers a route back to onboarding so the user can choose another country or city", () => {
    const source = readFileSync(settingsPath, "utf8");

    expect(source).toContain('to="/onboarding"');
    expect(source).toContain("援??쨌?꾩떆 ?ㅼ떆 ?좏깮");
    expect(source).toContain("?ㅻЦ ?붾㈃");
  });
});
