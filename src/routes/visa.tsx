import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, FileCheck2, IdCard, ExternalLink, AlertCircle, Building, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useDiploLifeStore } from "@/lib/diplolife/state";

export const Route = createFileRoute("/visa")({
  head: () => ({ meta: [{ title: "비자 가이드 - DiploLife" }] }),
  component: VisaPage,
});

function VisaPage() {
  const profile = useDiploLifeStore((state) => state.userProfile);
  const visaDday = useDiploLifeStore((state) => state.dashboard.visaDday);
  const publicData = useDiploLifeStore((state) => state.publicData);
  
  const dDay = visaDday.daysRemaining;
  const isExpiringSoon = dDay !== null && dDay <= 90;

  return (
    <AppShell eyebrow="Visa Guide" title="비자 및 체류 가이드">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Visa Status Card */}
        <article className="col-span-full rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-1 stagger-child" style={{ "--index": 1 } as any}>
          <div className="flex items-center gap-3">
            <IdCard className="h-6 w-6 text-primary" />
            <h2 className="text-[18px] font-bold">현재 체류 자격</h2>
          </div>
          
          <div className="mt-8 flex flex-col items-center justify-center py-6">
            <div className={`flex h-32 w-32 items-center justify-center rounded-full shadow-lg ${isExpiringSoon ? 'bg-amber-500' : 'bg-primary'} text-white`}>
              <div className="text-center">
                <span className="block text-3xl font-black">
                  {dDay === null ? "미등록" : dDay < 0 ? `D+${Math.abs(dDay)}` : `D-${dDay}`}
                </span>
              </div>
            </div>
            <h3 className="mt-6 text-2xl font-bold">{profile?.visaType || "비자 미설정"}</h3>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1 text-sm font-medium text-muted-foreground">
              <Building className="h-4 w-4" />
              {profile?.country || "국가 정보 없음"} 체류 중            </div>
          </div>
        </article>

        {/* Required Actions */}
        <article className="col-span-full rounded-3xl border border-border bg-card p-6 shadow-sm lg:col-span-2 stagger-child" style={{ "--index": 2 } as any}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck2 className="h-6 w-6 text-amber-500" />
              <h2 className="text-[18px] font-bold">비자 갱신 가이드</h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="text-[15px] font-bold text-amber-700 dark:text-amber-500">갱신 서류 준비 요망</h4>
                  <p className="mt-1 text-[13px] text-amber-600/80 dark:text-amber-400/80">
                    비자 만료일 90일 전부터 갱신 신청이 가능합니다. 현지 출입국 관리소 예약이 밀릴 수 있으므로 미리 서류를 준비하세요.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[14px] font-semibold text-muted-foreground px-2 pt-2">입국 및 비자 요건</h4>
              {publicData?.visa ? (
                <div className="p-4 rounded-2xl bg-surface-alt border border-border">
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{publicData.visa.remark || publicData.visa.gnrl_pspt_visa_cn || "상세 내용 없음"}</p>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-surface-alt border border-border">
                  <p className="text-[14px] text-muted-foreground">데이터가 없습니다.</p>
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
                <h3 className="text-[16px] font-bold">관할 대사관/영사관 예약하기</h3>
                <p className="text-[14px] text-muted-foreground mt-0.5">현지 행정처 또는 대한민국 공관 홈페이지로 이동합니다.</p>
              </div>
            </div>
            <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </article>

      </div>
    </AppShell>
  );
}
