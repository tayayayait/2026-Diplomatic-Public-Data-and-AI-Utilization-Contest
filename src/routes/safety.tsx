import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Building2, Info, Map, MessageCircle, PhoneCall, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/diplolife/AppShell";
import { useDiploLifeStore } from "@/lib/diplolife/state";

export const Route = createFileRoute("/safety")({
  head: () => ({ meta: [{ title: "안전 | DiploLife" }] }),
  component: SafetyPage,
});

const UNKNOWN_TEXT = "확실한 정보 없음";
const CONSULAR_CENTER_PHONE = "+82-2-3210-0404";

export interface UniversalContactGroup {
  title: string;
  items: Array<{ label: string; value: string; type: "address" | "phone" | "email" | "link" | "other" }>;
}

export function parseUniversalContacts(value?: string | null): UniversalContactGroup[] {
  if (!value) return [];

  // Normalize text: add newlines before [ and ㅇ to properly split it if they are missing newlines.
  const normalizedValue = value
    .replace(/\[/g, '\n[')
    .replace(/ㅇ\s/g, '\nㅇ ')
    .replace(/\n+/g, '\n')
    .trim();

  const groups: UniversalContactGroup[] = [];
  let current: UniversalContactGroup = { title: "기본 정보", items: [] };

  for (const rawLine of normalizedValue.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length < 3) continue;

    const titleMatch = line.match(/\[(.*?)\]/);
    if (titleMatch) {
      if (current.items.length > 0) groups.push(current);
      current = { title: titleMatch[1].trim() || "기본 정보", items: [] };
      continue;
    }

    const cleanLine = line.replace(/^ㅇ\s*/, '').replace(/^-/, '').trim();
    const colonIndex = cleanLine.indexOf(':');
    let label = "정보";
    let text = cleanLine;

    if (colonIndex > -1 && colonIndex <= 32) {
      label = cleanLine.substring(0, colonIndex).trim();
      text = cleanLine.substring(colonIndex + 1).trim();
    }

    const lower = `${label} ${text}`.toLowerCase();
    const type = lower.includes("@")
      ? "email"
      : lower.includes("http") || lower.includes("www")
        ? "link"
        : /\+?\d[\d\s().-]{4,}\d/.test(text)
          ? "phone"
          : lower.includes("address") || lower.includes("주소")
            ? "address"
            : "other";

    current.items.push({ label, value: text, type });
  }

  if (current.items.length > 0) groups.push(current);
  return groups;
}

function formatDate(value?: string | null) {
  if (!value) return UNKNOWN_TEXT;
  const compact = value.trim();
  const normalized = /^(\d{4})(\d{2})(\d{2})$/.test(compact)
    ? compact.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
    : compact.slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? normalized : new Intl.DateTimeFormat("ko-KR").format(parsed);
}

function telHref(phone?: string | null) {
  const firstPhone = phone?.match(/\+?\d[\d\s().-]{4,}\d/);
  if (!firstPhone) return undefined;
  return `tel:${firstPhone[0].replace(/[^\d+]/g, "")}`;
}

function InfoBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-alt px-3 py-1 text-[12px] font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

function ContactAction({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: typeof PhoneCall;
  label: string;
  value?: string | null;
  hint?: string | null;
  href?: string;
}) {
  const content = (
    <div className="flex h-full items-start gap-4 rounded-lg border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 break-words text-[15px] font-bold text-foreground">{value || UNKNOWN_TEXT}</p>
        {hint && <p className="mt-1 text-[12px] leading-5 text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );

  if (!href) return content;
  return (
    <a href={href} className="block h-full">
      {content}
    </a>
  );
}

function SafetyPage() {
  const profile = useDiploLifeStore((state) => state.userProfile);
  const safetyLevel = useDiploLifeStore((state) => state.dashboard.safetyScore.level);
  const fetchDashboardData = useDiploLifeStore((state) => state.fetchDashboardData);
  const publicData = useDiploLifeStore((state) => state.publicData);

  useEffect(() => {
    if (profile?.countryCode || profile?.country) {
      void fetchDashboardData();
    }
  }, [fetchDashboardData, profile?.country, profile?.countryCode]);

  const countryName = publicData?.travel_alarm?.country_nm || profile?.country || "선택된 국가";
  const embassy = publicData?.embassy;
  const embassyPhone = embassy?.urgency_tel_no || embassy?.tel_no;
  const representativePhone = embassy?.tel_no;
  const freePhone = embassy?.free_tel_no || embassy?.center_tel_no;
  const contactGroups = useMemo(
    () => parseUniversalContacts(publicData?.local_contact?.contact_remark),
    [publicData?.local_contact?.contact_remark],
  );

  return (
    <AppShell eyebrow="안전" title={`${countryName} 안전 대시보드`} tone="danger">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">여행 경보 단계</p>
              <h2 className="mt-2 text-[36px] font-black text-foreground">
                {safetyLevel ? `${safetyLevel}단계` : UNKNOWN_TEXT}
              </h2>
            </div>
            <ShieldCheck className="h-12 w-12 text-primary" aria-hidden="true" />
          </div>
          <p className="mt-4 text-[14px] leading-6 text-muted-foreground">
            해당 지역으로 이동하기 전에 외교부의 공식 업데이트 및 현지 긴급 연락처를 확인하세요.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {publicData?.travel_alarm?.written_dt && <InfoBadge>{formatDate(publicData.travel_alarm.written_dt)}</InfoBadge>}
            {publicData?.accident?.wrt_dt && <InfoBadge>{formatDate(publicData.accident.wrt_dt)}</InfoBadge>}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-danger" aria-hidden="true" />
            <h2 className="text-[18px] font-bold">현재 주의보</h2>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-[14px] leading-6 text-muted-foreground">
            {publicData?.travel_alarm?.remark || publicData?.accident?.content || UNKNOWN_TEXT}
          </p>
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <PhoneCall className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-[18px] font-bold">긴급 연락처</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ContactAction
            icon={PhoneCall}
            label="영사 콜센터"
            value={CONSULAR_CENTER_PHONE}
            hint="해외 사건, 사고, 체포 또는 긴급 상담"
            href={telHref(CONSULAR_CENTER_PHONE)}
          />
          {embassyPhone && (
            <ContactAction
              icon={Building2}
              label={embassy?.embassy_kor_nm || "대사관 긴급 전화"}
              value={embassyPhone}
              hint={embassy?.embassy_addr}
              href={telHref(embassyPhone)}
            />
          )}
          {representativePhone && representativePhone !== embassyPhone && (
            <ContactAction icon={PhoneCall} label="대사관 대표 전화" value={representativePhone} href={telHref(representativePhone)} />
          )}
          {freePhone && (
            <ContactAction icon={MessageCircle} label="무료 또는 현지 상담 전화" value={freePhone} href={telHref(freePhone)} />
          )}
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Map className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-[18px] font-bold">현지 연락처 안내</h2>
        </div>
        {contactGroups.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {contactGroups.map((group) => (
              <article key={group.title} className="rounded-lg border border-border bg-surface-alt p-4">
                <h3 className="text-[15px] font-bold">{group.title}</h3>
                <ul className="mt-3 space-y-2">
                  {group.items.map((item, index) => (
                    <li key={`${group.title}-${index}`} className="text-[13px] leading-5 text-muted-foreground">
                      <span className="font-semibold text-foreground">{item.label}: </span>
                      {item.value}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-surface-alt p-5 text-[14px] text-muted-foreground">
            <Info className="h-5 w-5" aria-hidden="true" />
            현지 연락처 정보가 아직 제공되지 않습니다.
          </div>
        )}
      </section>
    </AppShell>
  );
}
