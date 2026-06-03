import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, FileCheck2, IdCard, ExternalLink, AlertCircle, Building, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useDiploLifeStore } from "@/lib/diplolife/state";

export const Route = createFileRoute("/visa")({
  head: () => ({ meta: [{ title: "鍮꾩옄 媛?대뱶 ??DiploLife" }] }),
  component: VisaPage,
});

function VisaPage() {
  const profile = useDiploLifeStore((state) => state.userProfile);
  const visaDday = useDiploLifeStore((state) => state.dashboard.visaDday);
  const publicData = useDiploLifeStore((state) => state.publicData);
  
  const dDay = visaDday.daysRemaining;
  const isExpiringSoon = dDay !== null && dDay <= 90;

  return (
    <AppShell eyebrow="Visa Guide" title="鍮꾩옄 諛?泥대쪟 媛?대뱶">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Visa Status Card */}
        <article className="col-span-full rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-1 stagger-child" style={{ "--index": 1 } as any}>
          <div className="flex items-center gap-3">
            <IdCard className="h-6 w-6 text-primary" />
            <h2 className="text-[18px] font-bold">?꾩옱 泥대쪟 ?먭꺽</h2>
          </div>
          
          <div className="mt-8 flex flex-col items-center justify-center py-6">
            <div className={`flex h-32 w-32 items-center justify-center rounded-full shadow-lg ${isExpiringSoon ? 'bg-amber-500' : 'bg-primary'} text-white`}>
              <div className="text-center">
                <span className="block text-3xl font-black">
                  {dDay === null ? "誘몃벑濡? : dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`"}
                </span>
              </div>
            </div>
            <h3 className="mt-6 text-2xl font-bold">{profile?.visaType || "鍮꾩옄 誘몄꽕??}</h3>"
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1 text-sm font-medium text-muted-foreground">
              <Building className="h-4 w-4" />
              {profile?.country || "援?? ?뺣낫 ?놁쓬"} 泥대쪟 以?            </div>
          </div>
        </article>

        {/* Required Actions */}
        <article className="col-span-full rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-2 stagger-child" style={{ "--index": 2 } as any}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-6 w-6 text-amber-500" />
              <h2 className="text-[18px] font-bold">鍮꾩옄 媛깆떊 媛?대뱶</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-[15px] font-bold text-amber-700 dark:text-amber-500">媛깆떊 ?쒕쪟 以鍮??붾쭩</h4>
                  <p className="mt-1 text-[13px] text-amber-600/80 dark:text-amber-400/80">
                    鍮꾩옄 留뚮즺??90???꾨???媛깆떊 ?좎껌??媛?ν빀?덈떎. ?꾩? 異쒖엯援?愿由ъ냼 ?덉빟??諛由????덉쑝誘濡?誘몃━ ?쒕쪟瑜?以鍮꾪븯?몄슂.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[14px] font-semibold text-muted-foreground px-2 pt-2">?낃뎅 諛?鍮꾩옄 ?붽굔</h4>
              {publicData?.visa ? (
                <div className="p-4 rounded-2xl bg-surface-alt border border-border">
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{publicData.visa.remark || publicData.visa.gnrl_pspt_visa_cn || "?곸꽭 ?댁슜 ?놁쓬"}</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-surface-alt border border-border">
                  <p className="text-[14px] text-muted-foreground">Text</p>
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Embassy Link */}
        <article className="col-span-full rounded-3xl border border-border bg-card p-6 shadow-sm md:col-span-1 lg:col-span-3 stagger-child hover:bg-surface-alt transition-colors cursor-pointer group" style={{ "--index": 3 } as any}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <CalendarClock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-[16px] font-bold">愿????ш?/?곸궗愿 ?덉빟?섍린</h3>
                <p className="text-[14px] text-muted-foreground mt-0.5">?꾩? ?됱젙泥??먮뒗 ??쒕?援?怨듦? ?덊럹?댁?濡??대룞?⑸땲??</p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </article>

      </div>
    </AppShell>
  );
}
