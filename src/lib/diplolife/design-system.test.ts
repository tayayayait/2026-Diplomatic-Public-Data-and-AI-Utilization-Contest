import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const rootRoute = readFileSync(new URL("../../routes/__root.tsx", import.meta.url), "utf8");
const cardComponent = readFileSync(new URL("../../components/ui/card.tsx", import.meta.url), "utf8");
const inputComponent = readFileSync(new URL("../../components/ui/input.tsx", import.meta.url), "utf8");

const expectCssVariable = (name: string, value: string) => {
  expect(styles).toContain(`${name}: ${value};`);
};

describe("DiploLife design system foundation", () => {
  it("defines the ?곸꽭??md light-mode color tokens", () => {
    expectCssVariable("--dl-color-primary-default", "#1B6EF3");
    expectCssVariable("--dl-color-primary-hover", "#1558C7");
    expectCssVariable("--dl-color-primary-subtle", "#EBF2FE");
    expectCssVariable("--dl-color-accent-default", "#F59E0B");
    expectCssVariable("--dl-color-danger-default", "#DC4A4A");
    expectCssVariable("--dl-color-success-default", "#16A34A");
    expectCssVariable("--dl-color-surface-base", "#F8F9FB");
    expectCssVariable("--dl-color-text-primary", "#0F172A");
    expectCssVariable("--dl-color-border-default", "#E2E8F0");
  });

  it("maps existing Tailwind semantic variables onto DiploLife tokens", () => {
    expectCssVariable("--primary", "var(--dl-color-primary-default)");
    expectCssVariable("--primary-hover", "var(--dl-color-primary-hover)");
    expectCssVariable("--accent", "var(--dl-color-accent-default)");
    expectCssVariable("--danger", "var(--dl-color-danger-default)");
    expectCssVariable("--success", "var(--dl-color-success-default)");
    expectCssVariable("--background", "var(--dl-color-surface-base)");
    expectCssVariable("--foreground", "var(--dl-color-text-primary)");
    expectCssVariable("--border", "var(--dl-color-border-default)");
  });

  it("defines the ?곸꽭??md dark-mode token overrides", () => {
    expect(styles).toContain(".dark {");
    expectCssVariable("--dl-color-primary-default", "#60A5FA");
    expectCssVariable("--dl-color-surface-base", "#0C0F14");
    expectCssVariable("--dl-color-surface-elevated", "#1A1E27");
    expectCssVariable("--dl-color-text-primary", "#F1F5F9");
    expectCssVariable("--dl-color-border-default", "#1E293B");
  });

  it("keeps browser zoom enabled for mobile accessibility", () => {
    expect(rootRoute).toContain("width=device-width, initial-scale=1");
    expect(rootRoute).not.toMatch(/maximum-scale=1|user-scalable=0|user-scalable=no/);
  });

  it("aligns the shared button primitive with DiploLife button sizing", () => {
    expect(buttonVariants({ size: "default" })).toContain("h-11");
    expect(buttonVariants({ size: "sm" })).toContain("h-9");
    expect(buttonVariants({ size: "lg" })).toContain("h-[52px]");
    expect(buttonVariants({ size: "icon" })).toContain("h-11");
    expect(buttonVariants({ size: "icon" })).toContain("w-11");
  });

  it("aligns shared card, input, and badge primitives with DiploLife component specs", () => {
    expect(cardComponent).toContain("rounded-[20px]");
    expect(cardComponent).toContain("shadow-card");
    expect(inputComponent).toContain("h-11");
    expect(inputComponent).toContain("rounded-xl");
    expect(inputComponent).toContain("bg-surface-alt");
    expect(badgeVariants({ variant: "default" })).toContain("h-6");
    expect(badgeVariants({ variant: "default" })).toContain("rounded-lg");
  });
});
