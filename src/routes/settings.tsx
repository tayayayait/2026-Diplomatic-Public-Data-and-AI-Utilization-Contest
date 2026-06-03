import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, LogOut, ChevronRight, UserRoundX, Globe, Building } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useSupabaseAuth } from "@/lib/auth-context";
import { useDiploLifeStore } from "@/lib/diplolife/state";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "설정 | DiploLife" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = Route.useNavigate();
  const { signOut, user } = useSupabaseAuth();
  const profile = useDiploLifeStore((state) => state.userProfile);
  const updateSettings = useDiploLifeStore((state) => state.updateNotificationSettings);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const notificationsEnabled = profile?.notificationSettings?.safety ?? true;
  const toggleNotifications = () => updateSettings({ safety: !notificationsEnabled });
  const displayName = profile?.name || user?.user_metadata?.display_name || user?.email || "사용자";
  const handleLogout = async () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;

    setIsSigningOut(true);
    try {
      await signOut();
      await navigate({ to: "/" });
    } catch (error) {
      console.error("Failed to sign out:", error);
      alert("로그아웃에 실패했습니다.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("정말 탈퇴하시겠습니까? (이 작업은 되돌릴 수 없습니다.)")) {
      alert("회원탈퇴가 완료되었습니다.");
      // TODO: call API to delete
    }
  };

  return (
    <AppShell eyebrow="Settings & Profile" title="설정 / 프로필">
      <div className="mx-auto max-w-2xl space-y-8">
        
        {/* Profile Card */}
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm stagger-child" style={{ "--index": 1 } as any}>
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-alt">
              <span className="text-3xl font-bold text-primary">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{displayName}</h2>
              {user?.email && <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {profile?.country || "국가 미설정"}
                </div>
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {profile?.visaType || "비자 미설정"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences List */}
        <section className="stagger-child space-y-2" style={{ "--index": 2 } as any}>
          <h3 className="px-4 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">환경 설정</h3>
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            
            <div className="flex items-center justify-between p-4 px-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-[15px]">실시간 알림</div>
                  <div className="text-[13px] text-muted-foreground">안전공지 및 기상특보 상황 알림</div>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input type="checkbox" className="peer sr-only" checked={notificationsEnabled} onChange={toggleNotifications} />
                <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-slate-700 dark:border-gray-600"></div>
              </label>
            </div>


          </div>
        </section>

        {/* Account List */}
        <section className="stagger-child space-y-2" style={{ "--index": 3 } as any}>
          <h3 className="px-4 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">계정 관리</h3>
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            
            <button
              onClick={handleLogout}
              disabled={isSigningOut}
              className="flex w-full items-center justify-between p-4 px-6 border-b border-border hover:bg-surface-alt/50 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt">
                  <LogOut className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="font-semibold text-[15px]">{isSigningOut ? "로그아웃 중..." : "로그아웃"}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={handleDeleteAccount} className="flex w-full items-center justify-between p-4 px-6 hover:bg-red-500/10 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 group-hover:bg-red-500/20">
                  <UserRoundX className="h-5 w-5 text-red-500" />
                </div>
                <div className="font-semibold text-[15px] text-red-500">회원탈퇴</div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-300" />
            </button>

          </div>
        </section>

        <div className="text-center text-[12px] text-muted-foreground pt-4 pb-12 stagger-child" style={{ "--index": 4 } as any}>
          DiploLife v1.0.0 (Build 20260529)<br/>
          대한민국 외교부 공공데이터 실시간 API 연동
        </div>

      </div>
    </AppShell>
  );
}
