import { createServerFn } from "@tanstack/react-start";
import { getCurrentUser } from "./auth";
import { requireTeamLead } from "./team-lead-functions";

// Temporary stand-in for the FastAPI supervisor API. Response shapes follow the
// published contract so the screens can switch to real calls once the backend is reachable.

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
  {
    agent_id: "c4e8b2d1-0f3a-4b5c-8d7e-6f5a4b3c2d1e",
    agent_code: "Lerato_N",
    full_name: "Lerato Ndlovu",
    extension: "gs105",
    session_id: "8600054",
    status: "INCALL",
    sub_status: "LIVE",
    base_seconds: 1620,
    pause_code: null,
    campaign_id: "1001",
    active_customer: { customer_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", full_name: "Ayanda Dube", phone: "0823456789", suburb: "Sandton" },
  },
  {
    agent_id: "e5f6a7b8-c9d0-4e1f-a2b3-c4d5e6f7a8b9",
    agent_code: "Pieter_V",
    full_name: "Pieter van Wyk",
    extension: "gs106",
    session_id: "8600055",
    status: "DEAD",
    sub_status: "DISPO",
    base_seconds: 9,
    pause_code: null,
    campaign_id: "1001",
    active_customer: null,
  },
];

const STARTED_AT = Date.now();

function liveAgents(): LiveAgent[] {
  const elapsed = Math.floor((Date.now() - STARTED_AT) / 1000);
  return SEED_AGENTS.map(({ base_seconds, ...agent }) => ({
    ...agent,
    seconds_in_state: base_seconds + elapsed,
  }));
}

export const getLiveAgentsFn = createServerFn({ method: "GET" }).handler(async () => {
  requireTeamLead(await getCurrentUser());
  const agents = liveAgents();
  return {
    summary: {
      total_logged_in: agents.length,
      in_call: agents.filter((a) => a.status === "INCALL").length,
      ready: agents.filter((a) => a.status === "READY").length,
      paused: agents.filter((a) => a.status === "PAUSED").length,
    },
    agents,
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
    return {
      success: true,
      message: `Supervision channel dispatched to extension ${data.supervisor_extension} in ${data.mode} mode`,
      target_agent: data.target_agent_extension,
    };
  });

export const pauseAgentFn = createServerFn({ method: "POST" })
  .validator((data: { agent_code: string; pause_code: string }) => data)
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    return { success: true, message: `Agent ${data.agent_code} paused (${data.pause_code})` };
  });

export const hangupAgentFn = createServerFn({ method: "POST" })
  .validator((data: { agent_code: string; reason: string }) => data)
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
    return { success: true, message: `Call for agent ${data.agent_code} terminated` };
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
  qa_evaluation: { status: "pending" | "graded"; score_percent: number | null; reviewer: string | null; feedback: string | null };
};

const SEED_RECORDINGS: SupervisorRecording[] = [
  {
    id: "c71a3964-6d9b-4e1a-85d0-9a4f652b1234",
    agent_name: "Mukona Tshifhiwa",
    customer_name: "Lerato Ndlovu",
    customer_phone: "0823456789",
    disposition: "SALE",
    duration_seconds: 245,
    recorded_at: "2026-11-12T10:15:00Z",
    recording_url: "http://10.0.0.132/RECORDINGS/MP3/20261112-101500_0823456789.mp3",
    qa_evaluation: { status: "graded", score_percent: 90, reviewer: "Team Lead Sarah", feedback: "Great objection handling on price." },
  },
  {
    id: "d82b4a75-7e0c-4f2b-96e1-0b5a763c2345",
    agent_name: "Naledi Mokoena",
    customer_name: "Sipho Khumalo",
    customer_phone: "0842840069",
    disposition: "CALLBK",
    duration_seconds: 96,
    recorded_at: "2026-11-12T11:02:00Z",
    recording_url: "http://10.0.0.132/RECORDINGS/MP3/20261112-110200_0842840069.mp3",
    qa_evaluation: { status: "pending", score_percent: null, reviewer: null, feedback: null },
  },
];

export const getRecordingsFn = createServerFn({ method: "GET" })
  .validator((params?: { disposition?: string; min_seconds?: number }) => params ?? {})
  .handler(async ({ data }) => {
    requireTeamLead(await getCurrentUser());
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
    requireTeamLead(await getCurrentUser());
    const earned =
      data.greeting_score + data.pitch_score + data.objection_handling_score + data.closing_score + (data.compliance_verified ? 5 : 0);
    return { success: true, score_percent: Math.round((earned / 25) * 100) };
  });
