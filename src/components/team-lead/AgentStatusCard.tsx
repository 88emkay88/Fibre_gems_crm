import type { LiveAgent } from "@/server/supervisor-functions";
import { Button } from "@/components/ui/button";

export type AgentAction =
  | { kind: "monitor"; agent: LiveAgent; mode: "LISTEN" | "WHISPER" | "BARGE" }
  | { kind: "pause"; agent: LiveAgent }
  | { kind: "hangup"; agent: LiveAgent };

const STATUS_BADGE: Record<LiveAgent["status"], { label: string; className: string }> = {
  INCALL: { label: "In call", className: "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" },
  READY: { label: "Ready", className: "border-cyan-500/50 bg-cyan-500/15 text-cyan-300" },
  PAUSED: { label: "Paused", className: "border-amber-500/50 bg-amber-500/15 text-amber-300" },
  DEAD: { label: "Finalising", className: "border-red-500/50 bg-red-500/15 text-red-400" },
};

const PAUSE_WARNING_SECONDS = 15 * 60;
const CALL_WARNING_SECONDS = 25 * 60;

export function formatDuration(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mmss = `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return h > 0 ? `${h}:${mmss}` : mmss;
}

function maskPhone(phone: string) {
  return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ****`;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AgentStatusCard({
  agent,
  pending,
  onAction,
}: {
  agent: LiveAgent;
  pending: boolean;
  onAction: (action: AgentAction) => void;
}) {
  const badge = STATUS_BADGE[agent.status];
  const overThreshold =
    (agent.status === "PAUSED" && agent.seconds_in_state > PAUSE_WARNING_SECONDS) ||
    (agent.status === "INCALL" && agent.seconds_in_state > CALL_WARNING_SECONDS);
  const badgeLabel =
    agent.status === "PAUSED" && agent.pause_code ? `Paused · ${agent.pause_code}` : badge.label;
  const inCall = agent.status === "INCALL" && agent.active_customer !== null;

  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border p-4 backdrop-blur-xl transition-colors ${
        overThreshold ? "border-amber-500/50 bg-amber-500/10" : "border-border bg-card"
      }`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
            {initials(agent.full_name)}
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{agent.full_name}</p>
            <p className="text-xs text-muted-foreground">Ext {agent.extension}</p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
          {badgeLabel}
        </span>
      </header>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Time in state</span>
        <span
          className={`font-mono font-semibold tabular-nums ${
            overThreshold ? "animate-pulse text-amber-300" : "text-foreground"
          }`}
        >
          {formatDuration(agent.seconds_in_state)}
        </span>
      </div>

      {agent.status === "INCALL" && agent.active_customer && (
        <div className="rounded-xl border border-border bg-background/60 p-3 text-sm">
          <p className="font-medium text-foreground">{agent.active_customer.full_name}</p>
          <p className="text-xs text-muted-foreground">
            {maskPhone(agent.active_customer.phone)} · {agent.active_customer.suburb}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {inCall && (
          <>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => onAction({ kind: "monitor", agent, mode: "LISTEN" })}>
              Listen
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => onAction({ kind: "monitor", agent, mode: "WHISPER" })}>
              Whisper
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => onAction({ kind: "monitor", agent, mode: "BARGE" })}>
              Barge
            </Button>
          </>
        )}
        {agent.status !== "PAUSED" && agent.status !== "DEAD" && (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => onAction({ kind: "pause", agent })}>
            Force pause
          </Button>
        )}
        {agent.status === "INCALL" && (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => onAction({ kind: "hangup", agent })}>
            Force hang up
          </Button>
        )}
      </div>
    </article>
  );
}
