/**
 * VICIdial / REMI telephony adapter (server-only).
 *
 * All telephony actions proxy through this module to the user's self-hosted
 * REMI FastAPI backend (which fronts VICIdial). The CRM never implements its
 * own telephony and never exposes backend credentials to the browser.
 *
 * Configuration (server env only, read inside handlers):
 *   REMI_API_URL   e.g. http://192.168.56.1:8080
 *   REMI_API_TOKEN bearer token the REMI backend accepts (optional)
 */

export type RemiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: "not_configured" | "unreachable" | "http_error" | "timeout";
      detail: string;
    };

const DIAL_TIMEOUT_MS = 10_000;

export function remiApiUrl(): string | null {
  const raw = process.env["REMI_API_URL"] || process.env["VICIDIAL_API_URL"] || "";
  return raw.replace(/\/+$/, "") || null;
}

export function remiToken(): string | null {
  const raw = process.env["REMI_API_TOKEN"] || process.env["VICIDIAL_API_TOKEN"] || "";
  return raw || null;
}

async function remiFetch<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown } = { method: "GET" },
): Promise<RemiResult<T>> {
  const base = remiApiUrl();
  if (!base) {
    return { ok: false, code: "not_configured", detail: "REMI_API_URL is not configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIAL_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = remiToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${base}${path}`, {
      method: init.method,
      headers,
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return {
        ok: false,
        code: "http_error",
        detail: `REMI returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      };
    }

    const text = await res.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { raw: text };
      }
    }
    return { ok: true, data: (parsed ?? {}) as T };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, code: "timeout", detail: "REMI backend did not respond in time" };
    }
    return {
      ok: false,
      code: "unreachable",
      detail: err instanceof Error ? err.message : "connection failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export type AgentStatus = {
  state: "offline" | "ready" | "paused" | "in_call";
  phoneNumber: string | null;
  callSeconds: number;
  campaign: string | null;
};

const emptyStatus: AgentStatus = {
  state: "offline",
  phoneNumber: null,
  callSeconds: 0,
  campaign: null,
};

/** Normalizes whatever shape the REMI backend returns into the UI contract. */
function normalizeStatus(raw: unknown): AgentStatus {
  if (!raw || typeof raw !== "object") return emptyStatus;
  const r = raw as Record<string, unknown>;
  const stateRaw = String(
    r["state"] ?? r["status"] ?? r["agent_status"] ?? "offline",
  ).toLowerCase();
  const state: AgentStatus["state"] =
    stateRaw.includes("call") || stateRaw.includes("incall")
      ? "in_call"
      : stateRaw.includes("pause")
        ? "paused"
        : stateRaw.includes("ready") || stateRaw.includes("live")
          ? "ready"
          : "offline";
  return {
    state,
    phoneNumber: (r["phone_number"] as string) ?? r["phone"] ?? null ?? null,
    callSeconds: typeof r["call_seconds"] === "number" ? r["call_seconds"] : 0,
    campaign: (r["campaign"] as string) ?? null,
  };
}

export async function fetchAgentStatus(): Promise<RemiResult<AgentStatus>> {
  const res = await remiFetch<unknown>("/api/v1/agent/status");
  if (!res.ok) return res;
  return { ok: true, data: normalizeStatus(res.data) };
}

export async function dialNumber(input: {
  phone: string;
  leadId?: string | null;
  customerId?: string | null;
}) {
  return remiFetch<unknown>("/api/v1/agent/dial", {
    method: "POST",
    body: {
      phone: input.phone,
      lead_id: input.leadId ?? null,
      customer_ref: input.customerId ?? null,
    },
  });
}

export async function hangUpCall() {
  return remiFetch<unknown>("/api/v1/agent/hangup", { method: "POST" });
}

export async function setHold(enabled: boolean) {
  return remiFetch<unknown>("/api/v1/agent/hold", { method: "POST", body: { enabled } });
}

export async function setMute(enabled: boolean) {
  return remiFetch<unknown>("/api/v1/agent/mute", { method: "POST", body: { enabled } });
}

export async function transferCall(destination: string) {
  return remiFetch<unknown>("/api/v1/agent/transfer", { method: "POST", body: { destination } });
}

/** VICIdial dispositions used by FibreGems: SALE, CALLBACK, NI, PAYMENT_PROMISED. */
export async function postDisposition(input: {
  phone?: string | null;
  leadId?: string | null;
  disposition: string;
  notes?: string | null;
}) {
  return remiFetch<unknown>("/api/v1/agent/disposition", {
    method: "POST",
    body: {
      lead_id: input.leadId ?? null,
      phone: input.phone ?? null,
      disposition: input.disposition,
      notes: input.notes ?? null,
    },
  });
}
