import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Shield,
  Radio,
  Mic,
  CalendarDays,
  Trophy,
  Sliders,
  ArrowRightLeft,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUserFn, logoutFn } from "@/server/functions";
import { LiveFloorMonitor } from "./LiveFloorMonitor";
import { RecordingsQAView } from "./RecordingsQAView";
import { CallbackPoolView } from "./CallbackPoolView";
import { AgentLeaderboardView } from "./AgentLeaderboardView";
import { TeamLeadSettingsView } from "./TeamLeadSettings";

type TeamLeadView = "floor" | "recordings" | "callbacks" | "stats" | "settings";

const NAV_ITEMS = [
  { id: "floor" as TeamLeadView, label: "Live Floor Monitor", icon: Radio },
  { id: "recordings" as TeamLeadView, label: "Recordings & QA", icon: Mic },
  { id: "callbacks" as TeamLeadView, label: "Callback Pool", icon: CalendarDays },
  { id: "stats" as TeamLeadView, label: "Shift Performance", icon: Trophy },
  { id: "settings" as TeamLeadView, label: "Supervisor Settings", icon: Sliders },
];

export function TeamLeadWorkspace() {
  const navigate = useNavigate();
  const [view, setView] = useState<TeamLeadView>("floor");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userName, setUserName] = useState("Team Leader");
  const [userRole, setUserRole] = useState("team_leader");

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await getCurrentUserFn();
        if (res?.user?.fullName) setUserName(res.user.fullName);
        if (res?.user?.role) setUserRole(res.user.role);
      } catch {
        // fallback to default
      }
    }
    void loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutFn();
    } finally {
      void navigate({ to: "/" });
    }
  };

  const activeNavItem = NAV_ITEMS.find((item) => item.id === view);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile overlay */}
      {menuOpen && (
        <Button
          variant="ghost"
          aria-label="Close menu"
          className="fixed inset-0 z-30 h-full w-full rounded-none bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Side Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-[#0e0e0e] transition-transform lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="flex h-[68px] items-center justify-between border-b border-white/5 px-5">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-gradient-to-br from-[#E07C2A] to-[#F5B021] text-black shadow-lg shadow-[#F5B021]/20">
              <Shield className="size-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide text-white">FibreGems</div>
              <div className="text-[11px] font-medium text-[#F5B021]">Supervisor Command</div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden text-white" onClick={() => setMenuOpen(false)}>
            <X className="size-5" />
          </Button>
        </div>

        {/* User Card */}
        <div className="border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#E07C2A] to-[#F5B021] font-bold text-black shadow">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold text-white">{userName}</div>
              <div className="text-[11px] font-medium text-white/50">
                {userRole === "admin" ? "System Admin" : "Team Leader"}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-3">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
            Floor Operations
          </p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setView(item.id);
                  setMenuOpen(false);
                }}
                className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-xs font-semibold transition ${
                  isActive
                    ? "border border-[#F5B021]/40 bg-[#F5B021]/15 text-[#F5B021] shadow-sm"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className={`size-4 ${isActive ? "text-[#F5B021]" : "text-white/50"}`} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="border-t border-white/5 p-3 space-y-2">
          
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-xs font-semibold text-[#EF4444] transition hover:bg-[#EF4444]/10 hover:text-[#EF4444]"
          >
            <LogOut className="size-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="min-h-screen lg:ml-64 pb-16">
        <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-3 border-b border-white/5 bg-[#0a0a0a]/95 px-4 backdrop-blur-xl md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <div>
              <div className="text-xs text-muted-foreground font-mono">FibreGems / Supervisor Floor</div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{activeNavItem?.label}</span>
                {view === "floor" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#22C55E]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#22C55E]">
                    <span className="size-1.5 rounded-full bg-[#22C55E] animate-ping" />
                    LIVE PBX
                  </span>
                )}
              </div>
            </div>
          </div>

        </header>

        <div className="p-4 md:p-8">
          {view === "floor" && <LiveFloorMonitor />}
          {view === "recordings" && <RecordingsQAView />}
          {view === "callbacks" && <CallbackPoolView />}
          {view === "stats" && <AgentLeaderboardView />}
          {view === "settings" && <TeamLeadSettingsView />}
        </div>
      </main>
    </div>
  );
}
