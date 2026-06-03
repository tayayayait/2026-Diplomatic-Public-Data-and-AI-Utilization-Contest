import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Loader2, LogIn, ShieldCheck, UserPlus } from "lucide-react";

import { useSupabaseAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "signup";

type AuthSearch = {
  mode: AuthMode;
  redirectTo: string;
};

const redirectTargets = [
  "/dashboard",
  "/onboarding",
  "/chat",
  "/itinerary",
  "/sos",
  "/cost",
  "/settings",
  "/safety",
  "/visa",
  "/notices",
  "/weather",
] as const;

type RedirectTarget = (typeof redirectTargets)[number];

const normalizeRedirectTo = (value: unknown): RedirectTarget => {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/auth")) {
    return "/dashboard";
  }

  return redirectTargets.includes(value as RedirectTarget) ? (value as RedirectTarget) : "/dashboard";
};

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "濡쒓렇??| DiploLife" }] }),
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    mode: search.mode === "signup" ? "signup" : "signin",
    redirectTo: normalizeRedirectTo(search.redirectTo),
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { signIn, signUp, status } = useSupabaseAuth();
  const [mode, setMode] = useState<AuthMode>(search.mode);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const title = isSignup ? "회원가입" : "로그인";
  const submitLabel = isSignup ? "계정 만들기" : "로그인";
  const Icon = isSignup ? UserPlus : LogIn;

  const emailRedirectTo = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const params = new URLSearchParams({
      redirectTo: search.redirectTo,
    });
    return `${window.location.origin}/auth?${params.toString()}`;
  }, [search.redirectTo]);

  useEffect(() => {
    setMode(search.mode);
  }, [search.mode]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void navigate({ replace: true, to: normalizeRedirectTo(search.redirectTo) });
  }, [navigate, search.redirectTo, status]);

  const switchMode = (nextMode: AuthMode) => {
    setErrorMessage(null);
    setMessage(null);
    setMode(nextMode);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (isSignup) {
        const result = await signUp({
          displayName,
          email,
          password,
          redirectTo: emailRedirectTo,
        });

        if (result.needsEmailConfirmation) {
          setMessage("?뺤씤 硫붿씪??諛쒖넚?덉뒿?덈떎. ?대찓???몄쬆 ??濡쒓렇?명븯?몄슂.");
          return;
        }
      } else {
        await signIn({ email, password });
      }

      await navigate({ replace: true, to: normalizeRedirectTo(search.redirectTo) });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "?몄쬆 ?붿껌???ㅽ뙣?덉뒿?덈떎.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src="/home-hero-animation.webp"
            alt="DiploLife ?몄쬆 諛곌꼍"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/55" />
          <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
            <Link to="/" className="flex items-center gap-3 text-[18px] font-bold">
              <img src="/cat-logo.png" alt="" className="h-9 w-9 rounded-full bg-white object-cover" />
              DiploLife
            </Link>
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold backdrop-blur-md">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Supabase Auth
              </div>
              <h1 className="text-[48px] font-bold leading-[1.15]">
                ?몄뀡???좎??섍퀬 媛쒖씤?붾맂 泥대쪟 ?뺣낫瑜?蹂댄샇?⑸땲??
              </h1>
              <p className="mt-5 max-w-lg text-[16px] leading-7 text-white/85">
                ?대찓??湲곕컲 ?몄쬆?쇰줈 泥대쪟 ?꾨줈?? ?쇱젙, ?뚮┝ ?ㅼ젙???ъ슜??怨꾩젙???곌껐?⑸땲??
              </p>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Link to="/" className="flex items-center gap-3 text-[18px] font-bold">
                <img src="/cat-logo.png" alt="" className="h-9 w-9 rounded-full object-cover" />
                DiploLife
              </Link>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="mb-6">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h2 className="text-[28px] font-bold tracking-normal">{title}</h2>
                <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                  Supabase Auth濡?怨꾩젙???앹꽦?섍퀬 濡쒓렇???몄뀡???좎??⑸땲??
                </p>
              </div>

              <div className="mb-6 grid grid-cols-2 rounded-lg bg-surface-alt p-1">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={cn(
                    "h-10 rounded-md text-sm font-semibold transition-colors",
                    !isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  濡쒓렇??                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={cn(
                    "h-10 rounded-md text-sm font-semibold transition-colors",
                    isSignup ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  ?뚯썝媛??                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {isSignup && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold">?대쫫</span>
                    <input
                      autoComplete="name"
                      className="h-12 w-full rounded-lg border border-border bg-background px-3 text-[15px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Placeholder"
                      type="text"
                      value={displayName}
                    />
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">Text</span>
                  <input
                    autoComplete="email"
                    className="h-12 w-full rounded-lg border border-border bg-background px-3 text-[15px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    required
                    type="email"
                    value={email}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold">鍮꾨?踰덊샇</span>
                  <input
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    className="h-12 w-full rounded-lg border border-border bg-background px-3 text-[15px] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                    minLength={6}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="6???댁긽"
                    required
                    type="password"
                    value={password}
                  />
                </label>

                {message && (
                  <p className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                    {message}
                  </p>
                )}
                {errorMessage && (
                  <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
                    {errorMessage}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || status === "loading"}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  )}
                  {submitLabel}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
