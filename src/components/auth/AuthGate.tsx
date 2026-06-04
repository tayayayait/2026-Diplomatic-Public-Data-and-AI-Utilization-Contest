import { useEffect, type ReactNode } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { useSupabaseAuth } from "@/lib/auth-context";

export function AuthGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { status } = useSupabaseAuth();

  useEffect(() => {
    if (status !== "anonymous") return;

    void navigate({
      replace: true,
      search: { redirectTo: pathname, mode: "signin" as const },
      to: "/auth",
    });
  }, [navigate, pathname, status]);

  if (status !== "authenticated") {
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground"
      >
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          세션 확인 중...
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
