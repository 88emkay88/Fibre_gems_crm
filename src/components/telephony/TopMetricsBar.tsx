import { CalendarDays, CheckCircle2, Clock3, Activity, Plus, RefreshCw } from "lucide-react";
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
  const stats = [
    {
      label: "Scheduled today",
      value: scheduledToday,
      icon: CalendarDays,
      tone: "text-foreground",
    },
    { label: "Completed", value: completedToday, icon: CheckCircle2, tone: "text-success" },
    { label: "Remaining", value: remainingCalls, icon: Clock3, tone: "text-secondary-foreground" },
    { label: "Touches logged", value: totalTouches, icon: Activity, tone: "text-foreground" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="size-2 rounded-full bg-success" />
          <span>Live queue</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-full bg-card"
          >
            <RefreshCw className={isRefreshing ? "animate-spin" : ""} />
            Sync
          </Button>
          <Button size="sm" onClick={onQuickLead} className="rounded-full">
            <Plus />
            Quick lead
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>{label}</span>
              <Icon className="size-4" />
            </div>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Completion</span>
            <span>Target 80%</span>
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{completionRate}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                completionRate >= 80 ? "bg-success" : "bg-secondary"
              }`}
              style={{ width: `${Math.min(completionRate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
