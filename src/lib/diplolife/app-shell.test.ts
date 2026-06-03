import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = fileURLToPath(new URL("../..", import.meta.url));
const shellPath = join(srcDir, "components", "diplolife", "AppShell.tsx");
const routePath = (file: string) => join(srcDir, "routes", file);
const read = (path: string) => readFileSync(path, "utf8");

const appRouteFiles = [
  "dashboard.tsx",
  "chat.tsx",
  "itinerary.tsx",
  "cost.tsx",
  "settings.tsx",
  "safety.tsx",
  "visa.tsx",
  "notices.tsx",
] as const;

describe("DiploLife AppShell navigation", () => {
  it("defines the shared DiploLife shell with desktop, mobile, and SOS navigation", () => {
    expect(existsSync(shellPath)).toBe(true);

    const source = read(shellPath);
    expect(source).toContain("export function AppShell");
    expect(source).toContain('aria-label="二쇱슂 硫붾돱"');
    expect(source).toContain('aria-label="?섎떒 硫붾돱"');
    expect(source).toContain('aria-label="SOS ?닿린"');
    expect(source).toContain("lg:flex");
    expect(source).toContain("lg:hidden");
    expect(source).toContain("backdrop-blur-xl");
    expect(source).toContain("pb-[88px]");

    for (const route of ["/dashboard", "/chat", "/itinerary", "/sos", "/cost", "/settings"]) {
      expect(source).toContain(`to: "${route}"`);
    }
  });

  it("wraps every authenticated DiploLife route with AppShell", () => {
    for (const file of appRouteFiles) {
      const source = read(routePath(file));
      expect(source).toContain('from "@/components/diplolife/AppShell"');
      expect(source).toContain("<AppShell");
      expect(source).not.toContain('<main id="main-content"');
    }
  });

  it("leaves the unauthenticated landing page outside AppShell", () => {
    const source = read(routePath("index.tsx"));
    expect(source).not.toContain('from "@/components/diplolife/AppShell"');
    expect(source).toContain('<main id="main-content"');
  });
});
