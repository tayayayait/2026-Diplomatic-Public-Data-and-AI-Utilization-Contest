import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bell, MessageCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DiploLife — 해외 체류 생활 안전 동반자" },
      {
        name: "description",
        content: "해외 체류자를 위한 안전, 비자, 환율, 날씨, SOS 생활 대시보드입니다.",
      },
    ],
  }),
  component: LandingPage,
});

const SIGNALS = [
  { icon: ShieldCheck, label: "안전지수", value: "외교부 경보 기반" },
  { icon: Bell, label: "체류 알림", value: "비자·공지·날씨" },
  { icon: MessageCircle, label: "AI 상담", value: "Gemini 기반" },
] as const;

function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background text-foreground">
      <section className="relative flex min-h-[88vh] overflow-hidden">
        <img
          src="/home-hero-animation.webp"
          alt="해외 체류 안전 확인을 상징하는 산악 도시 풍경"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="relative z-10 flex w-full flex-col px-5 py-6 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between text-white">
            <Link to="/" className="text-[18px] font-bold tracking-normal">
              DiploLife
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex h-11 items-center rounded-full border border-white/30 bg-white/15 px-4 text-sm font-semibold backdrop-blur-md hover:bg-white/20"
            >
              대시보드
            </Link>
          </header>

          <div className="flex flex-1 items-center">
            <div className="max-w-3xl text-white">
              <p className="mb-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md">
                Public Data Living Companion
              </p>
              <h1 className="text-balance text-[48px] font-bold leading-[1.15] tracking-normal sm:text-[64px] lg:text-[78px]">
                DiploLife
              </h1>
              <p className="mt-5 max-w-2xl text-[16px] leading-7 text-white/88 sm:text-[18px]">
                해외 체류 중 필요한 안전, 비자, 환율, 날씨, 공지, SOS 정보를 한 화면에서 확인합니다.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/onboarding"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-raised hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98]"
                >
                  시작하기
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  to="/chat"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-white/35 bg-white/12 px-8 text-base font-semibold text-white backdrop-blur-md hover:bg-white/20"
                >
                  AI 상담 열기
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-10 grid w-[calc(100%-32px)] max-w-7xl gap-4 pb-16 md:grid-cols-3">
        {SIGNALS.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-[20px] border border-border bg-surface p-5 shadow-card"
            >
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-[18px] font-semibold leading-[1.4]">{item.label}</h2>
              <p className="mt-1 text-[14px] leading-6 text-muted-foreground">{item.value}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

