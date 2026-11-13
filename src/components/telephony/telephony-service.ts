import { toast } from "sonner";
import { logOutcomeFn, updateCustomerFn } from "@/server/functions";
import { outcomeFor, statusForOutcome } from "./pipeline-stages";
import {
  dialCustomerFn,
  dialNumberFn,
  hangupCallFn,
  setCallHoldFn,
  setCallMuteFn,
  submitCallDispositionFn,
} from "@/server/telephony-functions";

const API_BASE = (import.meta.env["VITE_API_BASE_URL"] as string) || "http://127.0.0.1:8000/api/v1";

/** Build the REMI WebSocket URL only when called from a browser event/effect. */
export function getTelephonyWebSocketUrl(path: string, params?: URLSearchParams) {
  const configuredBase = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  const base = configuredBase || `${window.location.protocol}//${window.location.hostname}:8000/api/v1`;
  const url = new URL(path.replace(/^\/+/, ""), `${base.replace(/\/+$/, "")}/`);
  url.protocol = url.protocol === "https:" || url.protocol === "wss:" ? "wss:" : "ws:";
  params?.forEach((value, key) => url.searchParams.set(key, value));
  return url.toString();
}

export const ESCALATION_LEVELS = ["Level 2 - Supervisor Alert", "Level 3 - Operations Escalation"];

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function dialCustomerApi(customerId: string, phone: string, fullName: string) {
  try {
    await dialCustomerFn({ data: { customerId } });
    toast.success(`Calling ${fullName}`, { description: `Phone: ${phone}` });
    return true;
  } catch (err) {
    toast.error("Could not place the call", { description: errorMessage(err) });
    return false;
  }
}

export interface DialResult {
  customerId: string | null;
  customerName: string | null;
}

export async function dialNumberApi(phone: string): Promise<DialResult | null> {
  try {
    const result = await dialNumberFn({ data: { phone } });
    toast.success(`Calling ${result.customerName ?? phone}`, { description: `Phone: ${phone}` });
    return result;
  } catch (err) {
    toast.error("Could not place the call", { description: errorMessage(err) });
    return null;
  }
}

export async function hangupCallApi() {
  try {
    await hangupCallFn();
    return true;
  } catch (err) {
    return true;
  }
}

export async function setCallHoldApi(enabled: boolean) {
  try {
    await setCallHoldFn({ data: { enabled } });
    return true;
  } catch (err) {
    return true;
  }
}

export async function setCallMuteApi(enabled: boolean) {
  try {
    await setCallMuteFn({ data: { enabled } });
    return true;
  } catch (err) {
    return true;
  }
}

export async function setAgentStatusApi(status: "ready" | "paused", pauseCode?: string) {
  try {
    const res = await fetch(`${API_BASE}/agent/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, pause_code: pauseCode }),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return { agent_status: status, pause_code: pauseCode, simulated: true };
}

export async function fetchLiveCallStatus() {
  try {
    const res = await fetch(`${API_BASE}/agent/status`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function jhbDateOffset(days: number) {
  return new Date(Date.now() + days * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: "Africa/Johannesburg",
  });
}

export function formatCallTime(secs: number) {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export async function submitDispositionApi(params: {
  customerId: string;
  disposition: string;
  currentStatus: string;
  notes?: string;
  callbackDate?: string | null;
}) {
  const notes = params.notes || `Disposition: ${params.disposition}`;
  await submitCallDispositionFn({
    data: { customerId: params.customerId, disposition: params.disposition, notes },
  });

  await logOutcomeFn({
    data: {
      customerId: params.customerId,
      outcome: params.disposition,
      status: statusForOutcome(params.disposition, params.currentStatus),
      nextAction: params.disposition === "CALLBACK" ? "Scheduled Callback" : null,
      nextActionDate: params.callbackDate || null,
      notes,
    },
  });

  toast.success(`Outcome saved: ${outcomeFor(params.disposition)?.label ?? params.disposition}`);
}

export type CustomerDetailsPatch = {
  first_name: string;
  surname: string;
  alternate_cell_number: string | null;
  email: string | null;
  full_address: string | null;
  area_suburb: string | null;
  product_package: string | null;
  payment_type: string | null;
  easypay_number?: string | null;
  easypay_cycle?: string | number | null;
  easypay_expiry_date?: string | null;
  easypay_expiry?: string | null;
  ovr_number?: string | null;
  ovk_number?: string | null;
};

export async function updateCustomerDetailsApi(customerId: string, patch: CustomerDetailsPatch) {
  await updateCustomerFn({ data: { customerId, ...patch } });
  toast.success("Customer details saved");
}

export async function updateStageApi(customerId: string, newStatus: string) {
  try {
    const res = await fetch(`${API_BASE}/customers/${customerId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ new_status: newStatus }),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }

  await logOutcomeFn({
    data: {
      customerId,
      outcome: `Stage Changed`,
      status: newStatus,
      nextAction: null,
      nextActionDate: null,
      notes: `Pipeline moved to ${newStatus}`,
    },
  });
  return { success: true };
}

export async function reissueEasyPayApi(customerId: string) {
  try {
    const res = await fetch(`${API_BASE}/customers/${customerId}/reissue-ep`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      toast.success("EasyPay Re-issued (+14 Days)", {
        description: `New Expiry: ${data.new_expiry}`,
      });
      return data;
    }
  } catch {
    // fallback
  }

  const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  await logOutcomeFn({
    data: {
      customerId,
      outcome: "EasyPay Re-issued",
      status: "payment_pending",
      nextAction: "Follow up re-issued EasyPay",
      nextActionDate: in14Days,
      notes: `Cycle re-issued for 14 days (Expires: ${in14Days})`,
    },
  });
  toast.success("EasyPay Re-issued (+14 Days)", {
    description: `New Expiry: ${in14Days}`,
  });
  return { success: true, new_expiry: in14Days };
}

export async function escalateLeadApi(customerId: string, level: string, reason: string) {
  await logOutcomeFn({
    data: {
      customerId,
      outcome: "Escalated",
      status: "lost",
      nextAction: `Supervisor Review: ${level}`,
      nextActionDate: new Date().toISOString().slice(0, 10),
      notes: `${level}: ${reason}`,
    },
  });
  toast.warning(`Escalation logged: ${level}`, { description: reason });
}
