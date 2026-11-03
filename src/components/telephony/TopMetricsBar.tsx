import React from "react";
import { PhoneCall, CheckCircle2, Clock, Activity, Plus, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopMetricsBarProps {
  scheduledToday: number;
  completedToday: number;
  remainingCalls: number;
  totalTouches: number;
  completionRate: number;
  onRefresh: () => void;
  onQuickLead: () => void;
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
  isRefreshing = false,
}: TopMetricsBarProps) {
  return (
    <div className="w-full space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Card 1: Scheduled Today */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm backdrop-blur-md">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
            <PhoneCall className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Scheduled Today</p>
            <p className="text-xl font-bold text-white">{scheduledToday}</p>
          </div>
        </div>

        {/* Card 2: Completed Today */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm backdrop-blur-md">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completed Today</p>
            <p className="text-xl font-bold text-emerald-400">{completedToday}</p>
          </div>
        </div>

        {/* Card 3: Remaining Calls */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm backdrop-blur-md">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
            <Clock className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Queue Backlog</p>
            <p className="text-xl font-bold text-amber-400">{remainingCalls}</p>
          </div>
        </div>

        {/* Card 4: Touches Logged */}
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm backdrop-blur-md">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-400">
            <Activity className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Touches</p>
            <p className="text-xl font-bold text-white">{totalTouches}</p>
          </div>
        </div>

        {/* Card 5: Completion Rate */}
        <div className="col-span-2 flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-sm backdrop-blur-md lg:col-span-1">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completion Rate</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">{completionRate}%</span>
              <span className="text-[10px] text-slate-400">target: 80%</span>
            </div>
          </div>
          <div className="relative size-10">
            <svg className="size-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={completionRate >= 80 ? "text-emerald-400" : "text-amber-400"}
                strokeDasharray={`${Math.min(completionRate, 100)}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-[10px] font-bold text-white">
              <Sparkles className="size-3 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-300">Live Queue & ViciDial Agent Command</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Sync Queue
          </Button>
          <Button
            size="sm"
            onClick={onQuickLead}
            className="bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1.5 size-3.5" />
            Quick Lead
          </Button>
        </div>
      </div>
    </div>
  );
}

