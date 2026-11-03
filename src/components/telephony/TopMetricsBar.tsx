import { CalendarDays, CheckCircle2, Clock3, Activity, Plus, RefreshCw, Radio } from "lucide-react";

interface TopMetricsBarProps {
  scheduledToday: number;
  completedToday: number;
  remainingCalls: number;
  totalTouches: number;
  completionRate: number;
  onRefresh: () => void;
  onQuickLead: () => void;
  onSimulateViciCall?: () => void;
  isRefreshing?: boolean;
}

export function TopMetricsBar({
  scheduledToday,
  completedToday,
  remainingCalls,
  totalTouches,
  completionRate,
  onRefresh,
  onQuickLead,
  onSimulateViciCall,
  isRefreshing = false,
}: TopMetricsBarProps) {
  const stats = [
    {
      label: "Scheduled",
      value: scheduledToday,
      icon: CalendarDays,
      accent: "text-white",
      bar: null,
    },
    {
      label: "Completed",
      value: completedToday,
      icon: CheckCircle2,
      accent: "text-[#22C55E]",
      bar: null,
    },
    {
      label: "Remaining",
      value: remainingCalls,
      icon: Clock3,
      accent: remainingCalls > 0 ? "text-[#F5B021]" : "text-white/60",
      bar: null,
    },
    {
      label: "Touches",
      value: totalTouches,
      icon: Activity,
      accent: "text-white",
      bar: null,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Row top */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#22C55E] animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Live Queue</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Demo ViciDial Trigger Button */}
          {onSimulateViciCall && (
            <button
              onClick={onSimulateViciCall}
              className="flex h-8 items-center gap-1.5 rounded-full border border-[#F5B021]/50 bg-[#F5B021]/15 px-3.5 text-xs font-bold text-[#F5B021] shadow-lg shadow-[#F5B021]/10 transition hover:bg-[#F5B021]/25 hover:scale-105 active:scale-95"
            >
              <Radio className="size-3.5 animate-pulse text-[#F5B021]" />
              Demo ViciDial Call
            </button>
          )}

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex h-8 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync
          </button>
          <button
            onClick={onQuickLead}
            className="flex h-8 items-center gap-2 rounded-full bg-gradient-to-r from-[#D44B2E] to-[#F5B021] px-4 text-xs font-bold text-black shadow-lg shadow-[#F5B021]/20 transition hover:opacity-90"
          >
            <Plus className="size-3" />
            Quick Lead
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="rounded-2xl border border-white/5 bg-[#141414] p-4 shadow-sm transition hover:border-white/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">{label}</span>
              <Icon className="size-4 text-white/20" />
            </div>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${accent}`}>{value}</p>
          </div>
        ))}

        {/* Completion card with progress bar */}
        <div className="rounded-2xl border border-white/5 bg-[#141414] p-4 shadow-sm transition hover:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Completion</span>
            <span className="text-[10px] font-bold text-white/20">Target 80%</span>
          </div>
          <p className={`mt-2 text-3xl font-bold tabular-nums ${completionRate >= 80 ? "text-[#22C55E]" : "text-[#F5B021]"}`}>
            {completionRate}%
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completionRate >= 80 ? "bg-[#22C55E]" : "bg-gradient-to-r from-[#D44B2E] to-[#F5B021]"
              }`}
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
