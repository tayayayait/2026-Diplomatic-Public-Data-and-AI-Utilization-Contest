import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bell, Filter, CalendarDays, ExternalLink, Megaphone } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useDiploLifeStore } from "@/lib/diplolife/state";

type NoticesSearch = {
  category?: string;
};

export const Route = createFileRoute("/notices")({
  head: () => ({ meta: [{ title: "공지 목록 | DiploLife" }] }),
  validateSearch: (search: Record<string, unknown>): NoticesSearch => {
    return {
      category: search.category as string | undefined,
    };
  },
  component: NoticesPage,
});

function NoticesPage() {
  const profile = useDiploLifeStore((state) => state.userProfile);
  const notices = useDiploLifeStore((state) => state.dashboard.notices);
  const { category: filter } = Route.useSearch();
  const navigate = Route.useNavigate();

  const setFilter = (val: string | null) => {
    navigate({ search: (prev) => ({ ...prev, category: val || undefined }), replace: true });
  };

  const filteredNotices = useMemo(() => {
    if (!filter) return notices.items;
    return notices.items.filter((n) => n.category === filter);
  }, [notices, filter]);

  return (
    <AppShell eyebrow="Notices" title="체류국 안전 공지">
      <div className="mx-auto max-w-4xl">
        {/* Header & Filters */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 stagger-child"
          style={{ "--index": 1 } as any}
        >
          <div>
            <h2 className="text-[15px] font-semibold text-muted-foreground">
              {profile?.country || "전세계"} 관련 외교부 공지사항
            </h2>
            <p className="text-[13px] text-muted-foreground mt-1">
              총 {notices.items.length}건의 안내가 있습니다.
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
            <button
              onClick={() => setFilter(null)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${!filter ? "bg-primary text-white" : "bg-surface-alt text-muted-foreground hover:bg-surface-alt/80"}`}
            >
              전체 보기
            </button>
            <button
              onClick={() => setFilter("SAFETY")}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${filter === "SAFETY" ? "bg-amber-500 text-white" : "bg-amber-500/10 text-amber-700 dark:text-amber-500 hover:bg-amber-500/20"}`}
            >
              안전 유의
            </button>
            <button
              onClick={() => setFilter("VISA")}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${filter === "VISA" ? "bg-green-500 text-white" : "bg-green-500/10 text-green-700 dark:text-green-500 hover:bg-green-500/20"}`}
            >
              비자/행정
            </button>
            <button
              onClick={() => setFilter("LIFE")}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors ${filter === "LIFE" ? "bg-blue-500 text-white" : "bg-blue-500/10 text-blue-700 dark:text-blue-500 hover:bg-blue-500/20"}`}
            >
              생활 안내
            </button>
          </div>
        </div>

        {/* Notices List */}
        <div className="space-y-4">
          {filteredNotices.length > 0 ? (
            filteredNotices.map((notice, idx) => (
              <article
                key={notice.id}
                className="group flex flex-col sm:flex-row items-start gap-4 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm hover:border-primary/50 transition-colors cursor-pointer stagger-child"
                style={{ "--index": 2 + idx } as any}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    notice.category === "SAFETY"
                      ? "bg-amber-500/10 text-amber-500"
                      : notice.category === "VISA"
                        ? "bg-green-500/10 text-green-500"
                        : "bg-blue-500/10 text-blue-500"
                  }`}
                >
                  {notice.category === "SAFETY" ? (
                    <Bell className="h-6 w-6" />
                  ) : notice.category === "VISA" ? (
                    <Megaphone className="h-6 w-6" />
                  ) : (
                    <CalendarDays className="h-6 w-6" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${
                        notice.category === "SAFETY"
                          ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                          : notice.category === "VISA"
                            ? "bg-green-500/20 text-green-700 dark:text-green-400"
                            : "bg-blue-500/20 text-blue-700 dark:text-blue-400"
                      }`}
                    >
                      {notice.category === "SAFETY"
                        ? "안전공지"
                        : notice.category === "VISA"
                          ? "비자/행정"
                          : "생활안내"}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {notice.publishedAt?.slice(0, 10)}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-bold truncate group-hover:text-primary transition-colors">
                    {notice.title}
                  </h3>
                </div>

                <div className="hidden sm:flex self-center shrink-0 h-10 w-10 items-center justify-center rounded-full bg-surface-alt group-hover:bg-primary/10 transition-colors">
                  <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                </div>
              </article>
            ))
          ) : (
            <div
              className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-border bg-surface-alt/50 stagger-child"
              style={{ "--index": 2 } as any}
            >
              <Bell className="h-10 w-10 text-muted-foreground/50 mb-4" />
              <p className="text-[15px] font-medium text-muted-foreground">
                조건에 맞는 공지사항이 없습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
