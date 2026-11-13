import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getLiveAgentsFn, hangupAgentFn, pauseAgentFn, startSupervisionFn, stopSupervisionFn, type LiveAgent } from "@/server/supervisor-functions";
import { AgentStatusCard, type AgentAction } from "./AgentStatusCard";
import { getStoredTeamLeadSettings } from "./TeamLeadSettings";
import { useTelephonySocket } from "@/components/telephony/use-telephony-socket";
import { DraggableCallDock, type DockSession } from "./DraggableCallDock";

const LIVE_QUERY_KEY = ["supervisor-live-agents"];

function successMessage(action: AgentAction, supervisorExt: string) {
  switch (action.kind) {
    case "monitor":
      if (action.mode === "LISTEN") return `Connecting silent monitor on your extension ${supervisorExt}...`;
      if (action.mode === "WHISPER") return `Connecting whisper coaching on your extension ${supervisorExt}...`;
      return `Connecting barge conference on your extension ${supervisorExt}...`;
    case "pause":
      return `Agent ${action.agent.full_name} has been remotely paused.`;
    case "hangup":
      return `Call for ${action.agent.full_name} has been terminated.`;
  }
}

async function runAction(action: AgentAction, supervisorExt: string): Promise<unknown> {
  switch (action.kind) {
    case "monitor":
      return await startSupervisionFn({
        data: {
          target_agent_extension: action.agent.agent_code,
          supervisor_extension: supervisorExt,
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
  const [supervisorExt, setSupervisorExt] = useState("101");
  const [dockSession, setDockSession] = useState<DockSession | null>(null);

  useEffect(() => {
    setSupervisorExt(getStoredTeamLeadSettings().supervisorExtension || "101");
  }, []);

  const liveQuery = useQuery({
    queryKey: LIVE_QUERY_KEY,
    queryFn: () => getLiveAgentsFn(),
  });

  type FloorData = Awaited<ReturnType<typeof getLiveAgentsFn>>;
  type FloorAgentEvent = {
    agent_id?: string;
    agent_code?: string;
    full_name?: string;
    extension?: string;
    conf_exten?: string;
    status?: string;
    sub_status?: string;
    seconds_in_state?: number;
    pause_code?: string | null;
    campaign_id?: string;
    lead_id?: string | number | null;
    active_customer?: LiveAgent["active_customer"];
  };
  type FloorEvent = {
    type?: string;
    summary?: FloorData["summary"];
    agents?: FloorAgentEvent[];
  };

  const onFloorEvent = useCallback((event: FloorEvent) => {
    if (event.type && event.type !== "FLOOR_UPDATE") return;
    qc.setQueryData<FloorData>(LIVE_QUERY_KEY, (previous) => {
      const prior = previous ?? { summary: { total_logged_in: 0, in_call: 0, ready: 0, paused: 0 }, agents: [] };
      const agents = event.agents?.map((item, index) => {
        const old = prior.agents.find((agent) =>
          (item.agent_code && agent.agent_code === item.agent_code) ||
          (item.agent_id && agent.agent_id === item.agent_id) ||
          (item.extension && agent.extension === item.extension.replace(/^SIP\//i, "")),
        );
        const rawStatus = (item.status ?? old?.status ?? "DEAD").toUpperCase();
        const status: LiveAgent["status"] = rawStatus === "INCALL" || rawStatus === "IN_CALL"
          ? "INCALL"
          : rawStatus === "READY"
            ? "READY"
            : rawStatus === "PAUSED"
              ? "PAUSED"
              : "DEAD";
        const leadId = item.lead_id == null ? null : String(item.lead_id);
        const activeCustomer = item.active_customer ?? (item.lead_id === undefined
          ? old?.active_customer ?? null
          : old?.active_customer?.customer_id === leadId ? old.active_customer : null);
        return {
          agent_id: item.agent_id ?? old?.agent_id ?? item.agent_code ?? `floor-${index}`,
          agent_code: item.agent_code ?? old?.agent_code ?? "",
          full_name: item.full_name ?? old?.full_name ?? item.agent_code ?? "Agent",
          extension: item.extension?.replace(/^SIP\//i, "") ?? old?.extension ?? item.agent_code ?? "",
          session_id: item.conf_exten ?? old?.session_id ?? "",
          status,
          sub_status: item.sub_status ?? old?.sub_status ?? "",
          seconds_in_state: Math.max(0, Math.floor(item.seconds_in_state ?? old?.seconds_in_state ?? 0)),
          pause_code: item.pause_code ?? old?.pause_code ?? null,
          campaign_id: old?.campaign_id ?? "",
          active_customer: activeCustomer,
        } satisfies LiveAgent;
      }) ?? prior.agents;
      return { summary: event.summary ?? prior.summary, agents };
    });
  }, [qc]);

  const floorSocket = useTelephonySocket<FloorEvent>({ path: "ws/floor", onMessage: onFloorEvent });

  const action = useMutation({
    mutationFn: (act: AgentAction) => runAction(act, supervisorExt),
    onSuccess: (_res, vars) => {
      toast.success(successMessage(vars, supervisorExt));
      if (vars.kind === "monitor") {
        setDockSession({ kind: "live", agent: vars.agent, mode: vars.mode, durationSeconds: 0 });
      }
      void qc.invalidateQueries({ queryKey: LIVE_QUERY_KEY });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Supervisor action failed"),
  });

  function handleAction(next: AgentAction) {
    if (next.kind === "hangup" && !window.confirm(`Force hang up the call for ${next.agent.full_name}?`)) return;
    action.mutate(next);
  }

  async function closeDock() {
    if (dockSession?.kind === "live") {
      await stopSupervisionFn({ data: { supervisor_extension: supervisorExt } });
      toast.success("Monitoring disconnected");
    }
    setDockSession(null);
  }

  async function changeMonitorMode(mode: "LISTEN" | "WHISPER" | "BARGE") {
    if (dockSession?.kind !== "live") return;
    await startSupervisionFn({
      data: {
        target_agent_extension: dockSession.agent.agent_code,
        supervisor_extension: supervisorExt,
        mode,
      },
    });
    setDockSession((current) => current?.kind === "live" ? { ...current, mode } : current);
    toast.success(`Monitoring mode changed to ${mode}`);
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
      <div className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
        <span className={`size-2 rounded-full ${floorSocket.status === "connected" ? "bg-success" : "bg-warning animate-pulse"}`} />
        {floorSocket.status === "connected" ? "Live floor connected" : floorSocket.status === "connecting" ? "Connecting to live floor…" : "Reconnecting to live floor…"}
      </div>
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
          {agents.map((agent, idx) => (
            <AgentStatusCard
              key={agent.agent_id || agent.agent_code || `agent-${idx}`}
              agent={agent}
              pending={action.isPending}
              onAction={handleAction}
            />
          ))}
        </div>
      )}
      {dockSession && <DraggableCallDock session={dockSession} onClose={closeDock} onModeChange={changeMonitorMode} />}
    </div>
  );
}
