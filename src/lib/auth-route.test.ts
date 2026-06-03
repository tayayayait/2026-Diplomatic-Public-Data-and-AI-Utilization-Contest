import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = fileURLToPath(new URL("..", import.meta.url));
const read = (path: string) => readFileSync(path, "utf8");
const routePath = (file: string) => join(srcDir, "routes", file);

describe("Supabase auth route integration", () => {
  it("defines a dedicated auth route backed by Supabase sign-in and sign-up actions", () => {
    const authRoutePath = routePath("auth.tsx");

    expect(existsSync(authRoutePath)).toBe(true);
    const source = read(authRoutePath);
    expect(source).toContain('createFileRoute("/auth")');
    expect(source).toContain("signIn(");
    expect(source).toContain("signUp(");
    expect(source).toContain("redirectTo");
    expect(source).toContain("Create account");
    expect(source).toContain("Sign in");
  });

  it("wraps protected app surfaces with a Supabase session gate", () => {
    const rootSource = read(routePath("__root.tsx"));
    const authGateSource = read(join(srcDir, "components", "auth", "AuthGate.tsx"));
    const appShellSource = read(join(srcDir, "components", "diplolife", "AppShell.tsx"));
    const onboardingSource = read(routePath("onboarding.tsx"));

    expect(rootSource).toContain("<AuthProvider>");
    expect(authGateSource).toContain("useSupabaseAuth");
    expect(authGateSource).toContain('to: "/auth"');
    expect(authGateSource).toContain("redirectTo: pathname");
    expect(appShellSource).toContain("<AuthGate>");
    expect(onboardingSource).toContain("<AuthGate>");
  });

  it("connects landing and settings actions to the Supabase auth flow", () => {
    const landingSource = read(routePath("index.tsx"));
    const settingsSource = read(routePath("settings.tsx"));

    expect(landingSource).toContain('to="/auth"');
    expect(landingSource).toContain('mode: "signup"');
    expect(landingSource).toContain('mode: "signin"');
    expect(settingsSource).toContain("signOut()");
    expect(settingsSource).not.toContain("TODO: clear auth token");
  });
});
