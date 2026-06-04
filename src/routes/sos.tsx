import { useMemo } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Building2, Flame, HeartPulse, Phone, ShieldAlert, X } from "lucide-react";
import { useDiploLifeStore, type SOSContact } from "@/lib/diplolife/state";

export const Route = createFileRoute("/sos")({
  head: () => ({ meta: [{ title: "SOS 긴급 요청 | DiploLife" }] }),
  component: SosPage,
});

const EMERGENCY_GUIDES = [
  { icon: ShieldAlert, label: "범죄 피해", desc: "현지 경찰에 신고 후 영사관에 연락하여 통역/변호사 안내를 요청하세요." },
  { icon: HeartPulse, label: "응급 환자", desc: "현지 응급번호 호출 후 대사관을 통해 의료진 소통 지원을 받으세요." },
  { icon: Flame, label: "재난/테러", desc: "즉시 대피처로 대피하고 대사관 및 영사콜센터에 본인의 안전 상태를 보고하세요." },
];

function SosPage() {
  const publicData = useDiploLifeStore((state) => state.publicData);

  const visibleContacts = useMemo(() => {
    const contacts: SOSContact[] = [];
    
    // 영사콜센터 (기본 고정)
    contacts.push({
      id: "consular-center",
      label: "영사콜센터 (24시간)",
      phone: "+82-2-3210-0404",
      type: "consular",
      availableOffline: true,
    });

    if (publicData) {
      if (publicData.embassy) {
        const emb = publicData.embassy;
        const phone = emb.urgency_tel_no || emb.tel_no;
        if (phone) {
          contacts.push({
            id: `embassy`,
            label: emb.embassy_kor_nm || "대한민국 대사관",
            phone,
            type: "embassy",
            availableOffline: true,
          });
        }
      }
      

    }

    if (contacts.length === 1) { // 데이터가 없을 경우
      contacts.push({
        id: "local-embassy-fallback",
        label: "대한민국 대사관 (현지)",
        phone: "112 / 911", // Placeholder
        type: "embassy",
        availableOffline: true,
      });
    }
    
    return contacts;
  }, [publicData]);

  return (
    <main className="fixed inset-0 z-[100] flex flex-col bg-danger text-white overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-danger px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-danger shadow-md">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">긴급 SOS</span>
        </div>
        <Link
          to="/dashboard"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
          aria-label="닫기"
        >
          <X className="h-6 w-6" />
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 flex-col px-6 pb-12 pt-6 sm:px-8">
        <h1 className="text-[32px] font-bold leading-tight sm:text-[48px]">
          도움이 필요하신가요?
        </h1>
        <p className="mt-4 text-[18px] text-white/90">
          침착하게 아래 연락처로 도움을 요청하세요.
        </p>

        {/* Contacts Grid */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 stagger-child" style={{ "--index": 1 } as any}>
          {visibleContacts.map((contact, idx) => (
            <div
              key={contact.id}
              className="group flex flex-col justify-between rounded-3xl bg-white p-6 text-foreground shadow-2xl shadow-black/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-black/20 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/[0.02] pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger transition-all duration-300 group-hover:scale-110 group-hover:bg-danger/20">
                    <Building2 className="h-7 w-7" />
                  </div>
                  <h2 className="text-[19px] font-bold leading-tight">{contact.label}</h2>
                </div>
              </div>
              
              <a
                href={contact.phone !== "안전 메뉴 확인" ? `tel:${contact.phone.replace(/[^0-9+]/g, '')}` : '#'}
                onClick={(e) => { if(contact.phone === "안전 메뉴 확인") e.preventDefault(); }}
                className="mt-8 flex h-[72px] w-full items-center justify-center gap-3 rounded-2xl bg-danger px-6 text-[22px] font-black tracking-wide text-white shadow-lg shadow-danger/30 transition-all duration-200 hover:bg-red-700 hover:shadow-danger/50 active:scale-95 relative z-10"
              >
                <Phone className="h-7 w-7 animate-pulse" />
                {contact.phone}
              </a>
            </div>
          ))}
        </div>

        {/* Emergency Guides */}
        <div className="mt-12 stagger-child" style={{ "--index": 2 } as any}>
          <h2 className="mb-6 text-[20px] font-bold">긴급 대처 가이드</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {EMERGENCY_GUIDES.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl border border-white/20 bg-black/20 p-6 backdrop-blur-xl shadow-lg transition-transform duration-300 hover:-translate-y-1">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 shadow-inner">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-[19px] font-bold text-white">{item.label}</h3>
                  </div>
                  <p className="text-[15px] leading-relaxed text-white/90 font-medium">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Notice */}
        <div className="mt-auto pt-12 text-center text-[13px] text-white/60 stagger-child" style={{ "--index": 3 } as any}>
          현지 통신 사정에 따라 연결이 지연될 수 있습니다. 인터넷이 불가한 경우 영사콜센터 24시간 앱을 사용하세요.
        </div>
      </div>
    </main>
  );
}
