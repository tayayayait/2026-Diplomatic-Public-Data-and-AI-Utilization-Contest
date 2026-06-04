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
        <video
          src="/home-hero-video.mp4"
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-slate-950/45" />
        
        {/* 전체 콘텐츠를 감싸는 중앙 정렬 컨테이너 */}
        <div className="relative z-10 flex w-full flex-col">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-6 sm:px-8">
            <header className="flex items-center justify-between text-white">
              <Link to="/" className="text-[18px] font-bold tracking-normal">
                DiploLife
              </Link>
            </header>

            <div className="flex flex-1 items-center mt-12 sm:mt-0">
              <div className="max-w-3xl text-white">
                <p className="mb-4 inline-flex rounded-full bg-white/15 px-4 py-1 text-[12px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md">
                  Public Data Living Companion
                </p>
                <h1 className="text-balance text-[48px] font-bold leading-[1.15] tracking-tight sm:text-[64px] lg:text-[82px]">
                  DiploLife
                </h1>
                <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-white/90 sm:text-[18px]">
                  해외 체류 중 필요한 안전, 비자, 환율, 날씨, 공지, SOS 정보를 한 화면에서 확인합니다.
                </p>
                <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                  <Link
                    to="/onboarding"
                    className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-white shadow-raised transition-transform hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    시작하기
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/chat"
                    className="inline-flex h-14 items-center justify-center rounded-full border border-white/35 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
                  >
                    AI 상담 열기
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 카드 섹션: max-w를 히어로 섹션과 통일하고 좌우 패딩을 동일하게 맞춤 */}
      <section className="relative z-20 mx-auto -mt-16 grid w-full max-w-7xl gap-6 px-5 sm:px-8 pb-16 md:grid-cols-3">
        {SIGNALS.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="flex flex-col rounded-[24px] border border-border/60 bg-surface/95 p-6 shadow-card backdrop-blur-sm transition-shadow hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-[19px] font-semibold leading-[1.4] text-foreground">{item.label}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.value}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}

