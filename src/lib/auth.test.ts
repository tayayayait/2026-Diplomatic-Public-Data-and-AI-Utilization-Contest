import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => {
  const subscription = { unsubscribe: vi.fn() };

  return {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    subscription,
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: authMock,
  },
}));

describe("Supabase auth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.onAuthStateChange.mockReturnValue({
      data: { subscription: authMock.subscription },
    });
  });

  it("retrieves the persisted Supabase session", async () => {
    const session = { access_token: "token", user: { id: "user-1" } };
    authMock.getSession.mockResolvedValueOnce({ data: { session }, error: null });
    const { getCurrentAuthSession } = await import("./auth");

    await expect(getCurrentAuthSession()).resolves.toBe(session);
    expect(authMock.getSession).toHaveBeenCalledTimes(1);
  });

  it("normalizes email and signs in with Supabase password auth", async () => {
    const session = { access_token: "token", user: { id: "user-1", email: "test@example.com" } };
    authMock.signInWithPassword.mockResolvedValueOnce({
      data: { session, user: session.user },
      error: null,
    });
    const { signInWithEmail } = await import("./auth");

    const result = await signInWithEmail({
      email: " TEST@Example.COM ",
      password: "secret123",
    });

    expect(authMock.signInWithPassword).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "secret123",
    });
    expect(result).toEqual({ session, user: session.user });
  });

  it("signs up with user metadata and email redirect URL", async () => {
    const user = { id: "user-1", email: "new@example.com" };
    authMock.signUp.mockResolvedValueOnce({
      data: { session: null, user },
      error: null,
    });
    const { signUpWithEmail } = await import("./auth");

    const result = await signUpWithEmail({
      displayName: "New User",
      email: " NEW@example.com ",
      password: "secret123",
      redirectTo: "https://app.example.com/auth?redirectTo=%2Fdashboard",
    });

    expect(authMock.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "secret123",
      options: {
        data: { display_name: "New User" },
        emailRedirectTo: "https://app.example.com/auth?redirectTo=%2Fdashboard",
      },
    });
    expect(result).toEqual({
      needsEmailConfirmation: true,
      session: null,
      user,
    });
  });

  it("signs out through Supabase Auth", async () => {
    authMock.signOut.mockResolvedValueOnce({ error: null });
    const { signOutFromSupabase } = await import("./auth");

    await expect(signOutFromSupabase()).resolves.toBeUndefined();
    expect(authMock.signOut).toHaveBeenCalledTimes(1);
  });

  it("subscribes to Supabase auth changes and returns an unsubscribe callback", async () => {
    const { subscribeToAuthChanges } = await import("./auth");
    const listener = vi.fn();

    const unsubscribe = subscribeToAuthChanges(listener);
    const callback = authMock.onAuthStateChange.mock.calls[0]?.[0];
    callback("SIGNED_IN", { user: { id: "user-1" } });
    unsubscribe();

    expect(listener).toHaveBeenCalledWith("SIGNED_IN", { user: { id: "user-1" } });
    expect(authMock.subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
