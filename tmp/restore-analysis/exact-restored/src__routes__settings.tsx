import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, LogOut, ChevronRight, UserRoundX, Globe, Building } from "lucide-react";
import { AppShell } from "@/components/diplolife/AppShell";
import { useSupabaseAuth } from "@/lib/auth-context";
import { useDiploLifeStore } from "@/lib/diplolife/state";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "?ㅼ젙 ??DiploLife" }] }),
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
  const displayName = profile?.name || user?.user_metadata?.display_name || user?.email || "?ъ슜??;
  const handleLogout = async () => {
    if (!confirm("濡쒓렇?꾩썐 ?섏떆寃좎뒿?덇퉴?")) return;

    setIsSigningOut(true);
    try {
      await signOut();
      await navigate({ to: "/" });
    } catch (error) {
      console.error("Failed to sign out:", error);
      alert("濡쒓렇?꾩썐???ㅽ뙣?덉뒿?덈떎.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("?뺣쭚 ?덊눜?섏떆寃좎뒿?덇퉴? (???묒뾽? ?섎룎由????놁뒿?덈떎.)")) {
      alert("?뚯썝?덊눜媛 ?꾨즺?섏뿀?듬땲??");
      // TODO: call API to delete
    }
  };

  return (
    <AppShell eyebrow="Settings & Profile" title="?ㅼ젙 / ?꾨줈??>
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
                  {profile?.country || "援?? 誘몄꽕??}
                </div>
                <div className="flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {profile?.visaType || "鍮꾩옄 誘몄꽕??}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Preferences List */}
        <section className="stagger-child space-y-2" style={{ "--index": 2 } as any}>
          <h3 className="px-4 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">?섍꼍 ?ㅼ젙</h3>
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            
            <div className="flex items-center justify-between p-4 px-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-[15px]">?몄떆 ?뚮┝</div>
                  <div className="text-[13px] text-muted-foreground">?덉쟾怨듭? 諛??꾧툒 ?곹솴 ?뚮┝</div>
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
          <h3 className="px-4 text-[13px] font-semibold text-muted-foreground uppercase tracking-wider">怨꾩젙 愿由?/h3>
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
                <div className="font-semibold text-[15px]">{isSigningOut ? "濡쒓렇?꾩썐 以? : "濡쒓렇?꾩썐"}</div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button onClick={handleDeleteAccount} className="flex w-full items-center justify-between p-4 px-6 hover:bg-red-500/10 transition-colors group">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 group-hover:bg-red-500/20">
                  <UserRoundX className="h-5 w-5 text-red-500" />
                </div>
                <div className="font-semibold text-[15px] text-red-500">?뚯썝?덊눜</div>
              </div>
              <ChevronRight className="h-5 w-5 text-red-300" />
            </button>

          </div>
        </section>

        <div className="text-center text-[12px] text-muted-foreground pt-4 pb-12 stagger-child" style={{ "--index": 4 } as any}>
          DiploLife v1.0.0 (Build 20260529)<br/>
          ??쒕?援??멸탳遺 怨듦났?곗씠???ы꽭 API ?곕룞
        </div>

      </div>
    </AppShell>
  );
}
