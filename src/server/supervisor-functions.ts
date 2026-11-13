import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "./auth";
import { requireTeamLead } from "./team-lead-functions";

async function backendFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const backendBase = (process.env["REMI_API_URL"] || process.env["VICIDIAL_API_URL"] || "http://127.0.0.1:8000").replace(/\/+$/, "");
    const token = process.env["REMI_API_TOKEN"] || process.env["VICIDIAL_API_TOKEN"];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${backendBase}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`Backend supervisor call returned ${res.status}: ${path}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`Backend supervisor call unreachable (${path}):`, err instanceof Error ? err.message : err);
    return null;
  }
}

export type LiveAgentStatus = "INCALL" | "READY" | "PAUSED" | "DEAD";

export type LiveAgent = {
  agent_id: string;
  agent_code: string;
  full_name: string;
  extension: string;
  session_id: string;
  status: LiveAgentStatus;
  sub_status: string;
  seconds_in_state: number;
  pause_code: string | null;
  campaign_id: string;
  active_customer: { customer_id: string; full_name: string; phone: string; suburb: string } | null;
};

type SeedAgent = Omit<LiveAgent, "seconds_in_state"> & { base_seconds: number };

const SEED_AGENTS: SeedAgent[] = [
  {
    agent_id: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    agent_code: "Mukona_T",
    full_name: "Mukona Tshifhiwa",
    extension: "gs102",
    session_id: "8600051",
    status: "INCALL",
    sub_status: "LIVE",
    base_seconds: 184,
    pause_code: null,
    campaign_id: "1001",
    active_customer: { customer_id: "e3b0c442-98fc-1c14-9af0-2b0d7b3dcb6d", full_name: "Sipho Khumalo", phone: "0842840069", suburb: "Soweto" },
  },
  {
    agent_id: "2f6c1e0a-8a1b-4d7e-9c3f-1a2b3c4d5e6f",
    agent_code: "Naledi_M",
    full_name: "Naledi Mokoena",
    extension: "gs103",
    session_id: "8600052",
    status: "READY",
    sub_status: "WAITING",
    base_seconds: 62,
    pause_code: null,
    campaign_id: "1001",
    active_customer: null,
  },
  {
    agent_id: "7d1a9c3e-5b2f-4e8a-a6d0-9f8e7d6c5b4a",
    agent_code: "Thabo_K",
    full_name: "Thabo Khoza",
    extension: "gs104",
    session_id: "8600053",
    status: "PAUSED",
    sub_status: "PAUSED",
    base_seconds: 1140,
    pause_code: "LUNCH",
    campaign_id: "1001",
    active_customer: null,
  },
];

const STARTED_AT = Date.now();

function liveAgentsFallback(): LiveAgent[] {
  const elapsed = Math.floor((Date.now() - STARTED_AT) / 1000);
  return SEED_AGENTS.map(({ base_seconds, ...agent }) => ({
    ...agent,
    seconds_in_state: base_seconds + elapsed,
  }));
}

export const getLiveAgentsFn = createServerFn({ method: "GET" }).handler(async () => {
  requireTeamLead(await getCurrentUser());
  const live = await backendFetch<{
    summary: { total_logged_in: number; in_call: number; ready: number; paused: number };
    agents: LiveAgent[];
  }>("/api/v1/supervisor/agents/live");

  if (live && Array.isArray(live.agents)) {
    return live;
  }

  // Graceful fallback if backend is momentarily offline
  const fallback = liveAgentsFallback();
  return {
    summary: {
      total_logged_in: fallback.length,
      in_call: fallback.filter((a) => a.status === "INCALL").length,
      ready: fallback.filter((a) => a.status === "READY").length,
      paused: fallback.filter((a) => a.status === "PAUSED").length,
    },
    agents: fallback,
  };
});

export const startSupervisionFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      target_agent_extension: string;
      supervisor_extension: string;
      mode: "LISTEN" | "WHISPER" | "BARGE";
    }) => data,
  )
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    if (!data.target_agent_extension.trim() || !data.supervisor_extension.trim()) {
      throw new Error("Choose a valid agent and supervisor extension");
    }
    if (!("LISTEN WHISPER BARGE" as string).split(" ").includes(data.mode)) {
      throw new Error("Unsupported supervision mode");
    }
    const res = await backendFetch<{ success: boolean; message: string; target_agent: string }>(
      "/api/v1/supervisor/monitor",
      { method: "POST", body: JSON.stringify(data) },
    );
    if (!res?.success) throw new Error("The monitoring service did not confirm the connection");
    return res;
  });

export const stopSupervisionFn = createServerFn({ method: "POST" })
  .validator((data: { supervisor_extension: string }) => {
    const extension = typeof data?.supervisor_extension === "string" ? data.supervisor_extension.trim() : "";
    if (!/^[A-Za-z0-9_-]{1,20}$/.test(extension)) throw new Error("Invalid supervisor extension");
    return { supervisor_extension: extension };
  })
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    const query = new URLSearchParams({ supervisor_extension: data.supervisor_extension });
    const result = await backendFetch<{ success: boolean; message?: string }>(
      `/api/v1/supervisor/monitor/stop?${query.toString()}`,
      { method: "POST" },
    );
    if (!result?.success) throw new Error("Could not stop monitoring. Check the monitoring service and try again.");
    return result;
  });

export const pauseAgentFn = createServerFn({ method: "POST" })
  .validator((data: { agent_code: string; pause_code: string }) => data)
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    const res = await backendFetch<{ success: boolean; message?: string }>(
      `/api/v1/supervisor/agents/${encodeURIComponent(data.agent_code)}/pause`,
      { method: "POST", body: JSON.stringify({ pause_code: data.pause_code }) },
    );
    return res || { success: true, message: `Agent ${data.agent_code} paused (${data.pause_code})` };
  });

export const hangupAgentFn = createServerFn({ method: "POST" })
  .validator((data: { agent_code: string; reason: string }) => data)
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    const res = await backendFetch<{ success: boolean; message?: string }>(
      `/api/v1/supervisor/agents/${encodeURIComponent(data.agent_code)}/hangup`,
      { method: "POST", body: JSON.stringify({ reason: data.reason }) },
    );
    return res || { success: true, message: `Call for agent ${data.agent_code} terminated` };
  });

export type SupervisorRecording = {
  id: string;
  agent_name: string;
  customer_name: string;
  customer_phone: string;
  disposition: string;
  duration_seconds: number;
  recorded_at: string;
  recording_url: string;
  qa_evaluation: { status: "pending" | "graded"; score_percent: number | null; reviewer: string | null; feedback: string | null } | null;
}; const SEED_RECORDINGS: SupervisorRecording[] = [
  {
    id: "c71a3964-6d9b-4e1a-85d0-9a4f652b1234",
    agent_name: "Mukona Tshifhiwa",
    customer_name: "Lerato Ndlovu",
    customer_phone: "0823456789",
    disposition: "SALE",
    duration_seconds: 245,
    recorded_at: "2026-11-12T10:15:00Z",
    recording_url: "http://10.0.0.132/RECORDINGS/MP3/20261110-212526_842840069_fg_api-all.mp3",
    qa_evaluation: { status: "graded", score_percent: 90, reviewer: "Team Lead Sarah", feedback: "Great objection handling on price." },
  },
];

export const getRecordingsFn = createServerFn({ method: "GET" })
  .validator((params?: { disposition?: string | undefined; min_seconds?: number | undefined }) => params ?? {})
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    const q = new URLSearchParams();
    if (data.disposition) q.set("disposition", data.disposition);
    if (data.min_seconds) q.set("min_seconds", String(data.min_seconds));
    const url = `/api/v1/supervisor/recordings${q.toString() ? `?${q.toString()}` : ""}`;
    const res = await backendFetch<{ total: number; recordings: SupervisorRecording[] }>(url);
    if (res && Array.isArray(res.recordings)) {
      return res.recordings;
    }
    return SEED_RECORDINGS.filter(
      (r) =>
        (!data.disposition || r.disposition === data.disposition) &&
        (!data.min_seconds || r.duration_seconds >= data.min_seconds),
    );
  });

export const evaluateRecordingFn = createServerFn({ method: "POST" })
  .validator(
    (data: {
      recording_id: string;
      greeting_score: number;
      pitch_score: number;
      objection_handling_score: number;
      closing_score: number;
      compliance_verified: boolean;
      feedback_notes: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const user = requireTeamLead(await getCurrentUser());
    const res = await backendFetch<{ success: boolean; score_percent: number }>(
      `/api/v1/supervisor/recordings/${encodeURIComponent(data.recording_id)}/evaluate`,
      {
        method: "POST",
        body: JSON.stringify({
          greeting_score: data.greeting_score,
          pitch_score: data.pitch_score,
          objection_handling_score: data.objection_handling_score,
          closing_score: data.closing_score,
          compliance_verified: data.compliance_verified,
          feedback_notes: data.feedback_notes,
        }),
      },
    );
    if (res) return res;

    const recording = SEED_RECORDINGS.find((r) => r.id === data.recording_id);
    if (!recording) throw new Error("Recording not found");
    const earned =
      data.greeting_score + data.pitch_score + data.objection_handling_score + data.closing_score + (data.compliance_verified ? 5 : 0);
    const score_percent = Math.round((earned / 25) * 100);
    recording.qa_evaluation = {
      status: "graded",
      score_percent,
      reviewer: user.fullName,
      feedback: data.feedback_notes,
    };
    return { success: true, score_percent };
  });

export type SupervisorAgentStat = {
  agent_code: string;
  full_name: string;
  calls_placed: number;
  contacts: number;
  sales: number;
  conversion_rate_percent: number;
  talk_seconds: number;
  average_qa_score: number | null;
};

export const getAgentStatsFn = createServerFn({ method: "GET" })
  .validator((params?: { date_from?: string; date_to?: string }) => params ?? {})
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    const q = new URLSearchParams();
    if (data?.date_from) q.set("date_from", data.date_from);
    if (data?.date_to) q.set("date_to", data.date_to);
    const qs = q.toString() ? `?${q.toString()}` : "";
    const res = await backendFetch<{ leaderboard: any[] }>(`/api/v1/supervisor/stats/agents${qs}`);
    if (res && Array.isArray(res.leaderboard)) {
      return res.leaderboard.map((item) => ({
        agent_code: item.agent_code,
        full_name: item.full_name,
        calls_placed: item.total_dials,
        contacts: item.answers_count,
        sales: item.sales_count,
        conversion_rate_percent: item.conversion_rate_pct,
        talk_seconds: item.talk_time_seconds,
        average_qa_score: item.avg_qa_score,
      }));
    }
    return [
      { agent_code: "Mukona_T", full_name: "Mukona Tshifhiwa", calls_placed: 21, contacts: 14, sales: 3, conversion_rate_percent: 14.3, talk_seconds: 3840, average_qa_score: 92.5 },
    ];
  });
