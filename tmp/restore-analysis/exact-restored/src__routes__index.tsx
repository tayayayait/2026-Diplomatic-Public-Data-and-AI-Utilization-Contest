import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Bell, LogIn, MessageCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DiploLife ???댁쇅 泥대쪟 ?앺솢 ?덉쟾 ?숇컲?? },
      {
        name: "description",
        content: "?댁쇅 泥대쪟?먮? ?꾪븳 ?덉쟾, 鍮꾩옄, ?섏쑉, ?좎뵪, SOS ?앺솢 ??쒕낫?쒖엯?덈떎.",
      },
    ],
  }),
  component: LandingPage,
});

const SIGNALS = [
  {
    icon: ShieldCheck,
    title: "?덉쟾吏??,
    desc: "?멸탳遺 ?ы뻾寃쎈낫 諛??꾩? ?ш굔?ш퀬 ?곗씠?곕? ?ㅼ떆媛꾩쑝濡?諛섏쁺?섏뿬 ?꾪뿕 ?붿냼瑜??ъ쟾??李⑤떒?⑸땲??",
  },
  {
    icon: Bell,
    title: "泥대쪟 ?뚮┝",
    desc: "鍮꾩옄 留뚮즺?? ?섏쑉 蹂?? 湲곗긽 ?밸낫 ???앺솢??吏곴껐??二쇱슂 怨듭?瑜??볦튂吏 ?딄쾶 ?뚮젮以띾땲??",
  },
  {
    icon: MessageCircle,
    title: "AI ?댁떆?ㅽ꽩??,
    desc: "Gemini 湲곕컲 AI 肄뷀뙆?쇰읉??泥대쪟 援??? 紐⑹쟻??留욌뒗 ?됰룞 吏移④낵 吏덈Ц??利됯컖 ?듬??⑸땲??",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "援?? 諛?鍮꾩옄 ?낅젰",
    desc: "異쒓뎅 ?덉젙 援??? 鍮꾩옄 ?좏삎, 泥대쪟 湲곌컙???낅젰?⑸땲??",
  },
  {
    step: "02",
    title: "AI 留욎땄 ?뺣낫 ?명똿",
    desc: "Gemini媛 怨듦났?곗씠?곕? 寃고빀?섏뿬 留욎땄???덉쟾/?앺솢 ?뺣낫瑜?以鍮꾪빀?덈떎.",
  },
  {
    step: "03",
    title: "??쒕낫??愿由?,
    desc: "?섎굹???듯빀 ??쒕낫?쒖뿉???ㅼ떆媛꾩쑝濡??댁쇅 ?앺솢???덉쟾?섍쾶 愿由ы븯?몄슂.",
  },
] as const;

function LandingPage() {
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative flex min-h-[80dvh] overflow-hidden">
        <img
          src="/home-hero-animation.webp"
          alt="?댁쇅 泥대쪟 ?덉쟾 ?뺤씤???곸쭠?섎뒗 ?곗븙 ?꾩떆 ?띻꼍"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-slate-950/50" />
        
        <div className="relative z-10 flex w-full flex-col px-5 py-6 sm:px-8 lg:px-12">
          {/* Navigation */}
          <header className="flex items-center justify-between text-white stagger-child" style={{ "--index": 1 } as any}>
            <Link to="/" className="text-[18px] font-bold tracking-normal">
              DiploLife
            </Link>
            <div className="flex items-center gap-3">
              <Link
                to="/onboarding"
                className="hidden items-center gap-2 text-sm font-semibold text-white/80 hover:text-white sm:flex"
              >
                <LogIn className="h-4 w-4" />
                濡쒓렇??              </Link>
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center rounded-full border border-white/30 bg-white/15 px-4 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-white/20"
              >
                ??쒕낫??              </Link>
            </div>
          </header>

          <div className="flex flex-1 items-center stagger-child" style={{ "--index": 2 } as any}>
            <div className="max-w-3xl text-white">
              <p className="mb-4 inline-flex rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold tracking-[0.12em] backdrop-blur-md">
                AI ?댁쇅?앺솢 肄뷀뙆?쇰읉
              </p>
              <h1 className="text-balance text-[48px] font-bold leading-[1.15] tracking-normal sm:text-[64px] lg:text-[78px]">
                ?댁쇅 ?앺솢,<br />AI媛 癒쇱? 梨숆꺼?쒕┰?덈떎.
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-7 text-white/90 sm:text-[18px]">
                ?멸탳遺 怨듦났?곗씠?곗? 理쒖떊 AI 湲곗닠??寃고빀?섏뿬, ?좏븰遺???뚰궧?由щ뜲?닿퉴吏 ?뱀떊???댁쇅 泥대쪟瑜?媛???덉쟾?섍쾶 吏?먰빀?덈떎.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/onboarding"
                  className="inline-flex h-14 items-center justify-between gap-4 rounded-full bg-primary pl-8 pr-2 text-base font-semibold text-white shadow-raised hover:scale-[1.02] hover:bg-primary-hover active:scale-[0.98]"
                >
                  臾대즺濡??쒖옉?섍린
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </div>
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex h-14 items-center justify-center rounded-full border border-white/35 bg-transparent px-8 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  ?쒕퉬???섎윭蹂닿린
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="relative z-20 mx-auto -mt-12 grid w-full max-w-7xl gap-5 px-5 sm:px-8 lg:px-12 md:grid-cols-3 stagger-child" style={{ "--index": 3 } as any}>
        {SIGNALS.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.title}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-md transition-shadow hover:shadow-lg"
            >
              <div>
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h2 className="text-[18px] font-semibold leading-[1.4] text-foreground">{item.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{item.desc}</p>
              </div>
            </article>
          );
        })}
      </section>

      {/* How it Works Section */}
      <section className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-8 lg:px-12">
        <div className="mb-12 text-center stagger-child" style={{ "--index": 4 } as any}>
          <h2 className="text-[32px] font-bold text-foreground sm:text-[40px]">??3?④퀎濡??앸굹???덉쟾 以鍮?/h2>
          <p className="mt-3 text-[16px] text-muted-foreground">蹂듭옟???덉감 ?놁씠 ?뱀떊?먭쾶 ?꾩슂??留욎땄 ?뺣낫瑜?援ъ꽦?⑸땲??</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, idx) => (
            <div key={step.step} className="stagger-child" style={{ "--index": 5 + idx } as any}>
              <div className="text-[48px] font-bold text-border">{step.step}</div>
              <h3 className="mt-2 text-[20px] font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="border-t border-border bg-surface-alt py-20 text-center">
        <div className="mx-auto max-w-3xl px-5 stagger-child" style={{ "--index": 6 } as any}>
          <h2 className="text-[32px] font-bold text-foreground">?댁쇅 泥대쪟???좊뱺???뚰듃??/h2>
          <p className="mt-4 text-[16px] text-muted-foreground">
            ?덉쟾?섍퀬 ?ㅻ쭏?명븳 ?꾩? ?앺솢???꾪빐 DiploLife? ?④퍡?섏꽭??
          </p>
          <Link
            to="/onboarding"
            className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-foreground px-10 text-base font-semibold text-background shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            ?쒖옉?섍린
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8 lg:px-12">
          <p className="text-[14px] font-semibold text-foreground">DiploLife</p>
          <ul className="flex gap-6 text-[13px] text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">?댁슜?쎄?</a></li>
            <li><a href="#" className="hover:text-foreground">媛쒖씤?뺣낫泥섎━諛⑹묠</a></li>
            <li><a href="#" className="hover:text-foreground">臾몄쓽?섍린</a></li>
          </ul>
          <p className="text-[13px] text-muted-foreground">짤 2026 DiploLife. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
