import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getLiveAgentsFn, hangupAgentFn, pauseAgentFn, startSupervisionFn } from "@/server/supervisor-functions";
import { AgentStatusCard, type AgentAction } from "./AgentStatusCard";

const SUPERVISOR_EXTENSION = "101";
const LIVE_QUERY_KEY = ["supervisor-live-agents"];

function successMessage(action: AgentAction) {
  switch (action.kind) {
    case "monitor":
      if (action.mode === "LISTEN") return `Connecting silent monitor on your extension ${SUPERVISOR_EXTENSION}...`;
      if (action.mode === "WHISPER") return `Connecting whisper coaching on your extension ${SUPERVISOR_EXTENSION}...`;
      return `Connecting barge conference on your extension ${SUPERVISOR_EXTENSION}...`;
    case "pause":
      return `Agent ${action.agent.full_name} has been remotely paused.`;
    case "hangup":
      return `Call for ${action.agent.full_name} has been terminated.`;
  }
}

async function runAction(action: AgentAction): Promise<unknown> {
  switch (action.kind) {
    case "monitor":
      return await startSupervisionFn({
        data: {
          target_agent_extension: action.agent.extension,
          supervisor_extension: SUPERVISOR_EXTENSION,
          mode: action.mode,
        },
      });
    case "pause":
      return await pauseAgentFn({ data: { agent_code: action.agent.agent_code, pause_code: "SUPERVISOR" } });
    case "hangup":
      return await hangupAgentFn({
        data: { agent_code: action.agent.agent_code, reason: "Supervisor terminated call" },
      });
  }
}

export function LiveFloorMonitor() {
  const qc = useQueryClient();

  const liveQuery = useQuery({
    queryKey: LIVE_QUERY_KEY,
    queryFn: () => getLiveAgentsFn(),
    refetchInterval: 2000,
  });

  const action = useMutation({
    mutationFn: runAction,
    onSuccess: (_res, vars) => {
      toast.success(successMessage(vars));
      void qc.invalidateQueries({ queryKey: LIVE_QUERY_KEY });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Supervisor action failed"),
  });

  function handleAction(next: AgentAction) {
    if (next.kind === "hangup" && !window.confirm(`Force hang up the call for ${next.agent.full_name}?`)) return;
    action.mutate(next);
  }

  if (liveQuery.isPending) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    );
  }

  if (liveQuery.isError) {
    return (
      <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {liveQuery.error instanceof Error ? liveQuery.error.message : "Could not load the live floor."}
      </p>
    );
  }

  const { summary, agents } = liveQuery.data;

  const tiles = [
    { label: "Logged in", value: summary.total_logged_in, className: "text-foreground" },
    { label: "In call", value: summary.in_call, className: "text-emerald-400" },
    { label: "Ready", value: summary.ready, className: "text-cyan-300" },
    { label: "On pause", value: summary.paused, className: "text-amber-300" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${t.className}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {agents.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No agents are logged in right now.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <AgentStatusCard
              key={agent.agent_id}
              agent={agent}
              pending={action.isPending}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}
