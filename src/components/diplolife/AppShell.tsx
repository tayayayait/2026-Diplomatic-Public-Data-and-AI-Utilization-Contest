import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  CircleDollarSign,
  Home,
  Menu,
  MessageCircle,
  Settings,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { cn } from "@/lib/utils";

const DESKTOP_NAV = [
  { to: "/dashboard", label: "대시보드", icon: Home },
  { to: "/chat", label: "AI 상담", icon: MessageCircle },
  { to: "/itinerary", label: "AI 일정", icon: CalendarDays },
  { to: "/sos", label: "SOS", icon: ShieldAlert },
  { to: "/cost", label: "비용", icon: CircleDollarSign },
] as const;

const MOBILE_TABS = [
  { to: "/dashboard", label: "홈", icon: Home },
  { to: "/chat", label: "상담", icon: MessageCircle },
  { to: "/itinerary", label: "일정", icon: CalendarDays },
  { to: "/cost", label: "비용", icon: CircleDollarSign },
  { to: "/settings", label: "프로필", icon: UserRound },
] as const;

const ICON_NAV = [
  { to: "/settings", label: "설정", icon: Settings },
] as const;

const isActiveRoute = (pathname: string, to: string) => {
  if (to === "/dashboard") return pathname === "/dashboard";
  return pathname === to || pathname.startsWith(`${to}/`);
};

export function AppShell({
  eyebrow,
  title,
  description,
  tone = "default",
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <AuthGate>
      <div className={cn("min-h-screen", tone === "danger" ? "bg-danger/8" : "bg-background")}>
      <DesktopHeader pathname={pathname} />
      <MobileHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto min-h-screen w-full max-w-7xl px-4 pb-[88px] pt-[72px] sm:px-6 lg:px-8 lg:pb-8 lg:pt-20"
      >
        <header className="mb-8">
          <p
            className={cn(
              "text-[11px] font-semibold uppercase tracking-[0.12em]",
              tone === "danger" ? "text-danger" : "text-primary",
            )}
          >
            {eyebrow}
          </p>
          <h1 className="mt-3 text-balance text-[32px] font-bold leading-[1.3] tracking-normal text-foreground md:text-[44px]">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-[15px] leading-7 text-muted-foreground">
              {description}
            </p>
          )}
        </header>

        {children}
      </main>

      <SosFloatingButton />
      <MobileBottomTabs pathname={pathname} />
      </div>
    </AuthGate>
  );
}

function DesktopHeader({ pathname }: { pathname: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-20 hidden h-16 border-b border-border bg-white/80 backdrop-blur-xl lg:flex">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-8">
        <Link to="/dashboard" className="flex items-center gap-2 text-[18px] font-bold tracking-normal text-foreground">
          <img src="/cat-logo.png" alt="DiploLife Logo" className="h-8 w-8 object-cover mix-blend-multiply" />
          DiploLife
        </Link>
        <nav aria-label="주요 메뉴" className="flex items-center gap-1">
          {DESKTOP_NAV.map((item) => {
            const active = isActiveRoute(pathname, item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-[10px] px-3 text-sm font-semibold",
                  active
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-1">
          {ICON_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.to}
                aria-label={item.label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

function MobileHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/90 px-4 backdrop-blur-xl lg:hidden">
      <Link to="/dashboard" className="flex items-center gap-2 text-[17px] font-bold tracking-normal text-foreground">
        <img src="/cat-logo.png" alt="DiploLife Logo" className="h-7 w-7 object-cover mix-blend-multiply" />
        DiploLife
      </Link>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="알림"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="메뉴"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}

function SosFloatingButton() {
  return (
    <Link
      to="/sos"
      aria-label="SOS 열기"
      className="fixed bottom-[88px] right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger text-white shadow-[0_10px_28px_rgba(220,74,74,0.35)] hover:scale-[1.02] active:scale-[0.98] lg:bottom-6"
    >
      <ShieldAlert className="h-6 w-6" aria-hidden="true" />
    </Link>
  );
}

function MobileBottomTabs({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="하단 메뉴"
      className="fixed inset-x-0 bottom-0 z-20 grid h-[72px] grid-cols-5 border-t border-border bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      {MOBILE_TABS.map((item) => {
        const active = isActiveRoute(pathname, item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon
              className={cn("h-5 w-5", active ? "fill-current stroke-current" : "")}
              aria-hidden="true"
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
