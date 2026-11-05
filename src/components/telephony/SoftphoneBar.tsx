import React, { useState, useEffect } from "react";
import { Check, ChevronDown, Phone, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import type { AgentTelephonyState, Customer } from "./types";
import {
  formatCallTime,
  jhbDateOffset,
  setAgentStatusApi,
  submitDispositionApi,
} from "./telephony-service";
import { endActiveCall } from "./CallControls";
import { ActiveCallPanel } from "./ActiveCallPanel";
import { OUTCOMES, outcomeFor } from "./pipeline-stages";

const PAUSE_CODES = ["LUNCH", "TEA", "MEETING", "TRAINING", "WRAPUP"];
interface SoftphoneBarProps {
  telephonyState: AgentTelephonyState;
  setTelephonyState: React.Dispatch<React.SetStateAction<AgentTelephonyState>>;
  onOpenDial: () => void;
  onDispositionComplete?: (customerId: string) => void;
  activeCustomer: Customer | null;
  onLogOutcome: () => void;
}

export function SoftphoneBar({
  telephonyState,
  setTelephonyState,
  onOpenDial,
  onDispositionComplete,
  activeCustomer,
  onLogOutcome,
}: SoftphoneBarProps) {
  const [selectedDispo, setSelectedDispo] = useState("SALE");
  const [callbackDate, setCallbackDate] = useState(() => jhbDateOffset(1));
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isCallActive =
    telephonyState.agentStatus === "in_call" || telephonyState.agentStatus === "dialing";

  useEffect(() => {
    if (telephonyState.agentStatus !== "in_call") return;
    const interval = setInterval(() => {
      setTelephonyState((prev) => ({ ...prev, callDurationSeconds: prev.callDurationSeconds + 1 }));
    }, 1000);
    return () => clearInterval(interval);
  }, [telephonyState.agentStatus, setTelephonyState]);

  const handleTogglePause = async (code?: string) => {
    const newStatus = telephonyState.agentStatus === "paused" ? "ready" : "paused";
    setPauseMenuOpen(false);
    await setAgentStatusApi(newStatus, code);
    setTelephonyState((prev) => ({
      ...prev,
      agentStatus: newStatus,
      pauseCode: newStatus === "paused" ? code || "LUNCH" : null,
    }));
    toast.info(`Status: ${newStatus === "paused" ? "On break" : "Ready"}`, {
      description: code ? `Reason: ${code}` : undefined,
    });
  };

  const handleSaveDisposition = async () => {
    const savedCustomerId = telephonyState.activeCustomerId;
    if (!savedCustomerId) {
      toast.error("No active customer for this outcome");
      return;
    }
    const needsDate = outcomeFor(selectedDispo)?.dateRequired ?? false;
    if (needsDate && !callbackDate) {
      toast.error("Pick a next action date");
      return;
    }

    setIsSaving(true);
    try {
      await submitDispositionApi({
        customerId: savedCustomerId,
        disposition: selectedDispo,
        currentStatus: activeCustomer?.status ?? "",
        notes: `Softphone outcome: ${selectedDispo}`,
        callbackDate: needsDate ? callbackDate : null,
      });
    } catch (err) {
      toast.error("Outcome not saved", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
      return;
    } finally {
      setIsSaving(false);
    }

    setTelephonyState((prev) => ({
      ...prev,
      activeCustomerId: null,
      activeCustomerName: null,
      activeCustomerPhone: null,
      callDurationSeconds: 0,
      agentStatus: "ready",
    }));

    onDispositionComplete?.(savedCustomerId);
  };

  const statusDot =
    telephonyState.agentStatus === "in_call"
      ? "bg-[#D44B2E]"
      : telephonyState.agentStatus === "paused"
        ? "bg-[#F5B021]"
        : "bg-[#22C55E]";

  const statusLabel =
    telephonyState.agentStatus === "in_call"
      ? "On call"
      : telephonyState.agentStatus === "dialing"
        ? "Dialing…"
        : telephonyState.agentStatus === "paused"
          ? `On break${telephonyState.pauseCode ? ` · ${telephonyState.pauseCode}` : ""}`
          : "Ready";

  return (
    <>
      {isCallActive && (
        <ActiveCallPanel
          telephonyState={telephonyState}
          setTelephonyState={setTelephonyState}
          activeCustomer={activeCustomer}
          onLogOutcome={onLogOutcome}
        />
      )}

      <div className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 items-center gap-3 lg:left-[calc(50%+8rem)]">
        {isCallActive ? (
          <button
            onClick={() => endActiveCall(setTelephonyState)}
            aria-label="Hang up"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-[#D44B2E] text-white shadow-[0_12px_30px_rgba(212,75,46,0.35)] transition hover:scale-105 active:scale-95"
          >
            <PhoneOff className="size-6" />
          </button>
        ) : (
          <button
            onClick={onOpenDial}
            disabled={telephonyState.agentStatus === "dialing"}
            aria-label="Dial a number"
            className="grid size-14 shrink-0 place-items-center rounded-full bg-[#22C55E] text-black shadow-[0_12px_30px_rgba(34,197,94,0.35)] transition hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Phone className="size-6" />
          </button>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[20px] border border-white/10 bg-[#111111]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className={`size-2.5 shrink-0 rounded-full ${statusDot} ${isCallActive ? "animate-pulse" : ""}`}
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {isCallActive ? telephonyState.activeCustomerName || "Active lead" : statusLabel}
                </p>
                <p className="truncate text-xs text-white/40">
                  {isCallActive
                    ? telephonyState.activeCustomerPhone || ""
                    : "Dial a number, or click Call on a lead"}
                </p>
              </div>
            </div>

            {isCallActive ? (
              <span className="font-mono text-lg font-bold tabular-nums text-[#F5B021]">
                {formatCallTime(telephonyState.callDurationSeconds)}
              </span>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setPauseMenuOpen((open) => !open)}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  {telephonyState.agentStatus === "paused" ? "Resume" : "Break"}
                  <ChevronDown className="size-3" />
                </button>
                {pauseMenuOpen && (
                  <div className="absolute bottom-11 right-0 z-10 w-44 rounded-xl border border-white/10 bg-[#1a1a1a] p-1.5 shadow-2xl">
                    {telephonyState.agentStatus === "paused" ? (
                      <button
                        onClick={() => handleTogglePause()}
                        className="w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#22C55E] hover:bg-white/5"
                      >
                        Back to Ready
                      </button>
                    ) : (
                      PAUSE_CODES.map((code) => (
                        <button
                          key={code}
                          onClick={() => handleTogglePause(code)}
                          className="w-full rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:bg-white/5 hover:text-white"
                        >
                          {code}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {!isCallActive && (
            <div className="flex items-center gap-2">
              <select
                value={selectedDispo}
                onChange={(e) => setSelectedDispo(e.target.value)}
                disabled={!telephonyState.activeCustomerId}
                aria-label="Outcome"
                className="h-9 flex-1 rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium text-white disabled:opacity-30 focus:border-[#F5B021]/50 focus:outline-none"
              >
                {OUTCOMES.map((o) => (
                  <option key={o.code} value={o.code} className="bg-[#1a1a1a] text-white">
                    {o.label}
                  </option>
                ))}
              </select>
              {outcomeFor(selectedDispo)?.dateRequired && (
                <input
                  type="date"
                  value={callbackDate}
                  min={jhbDateOffset(0)}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  aria-label="Next action date"
                  required
                  className="h-9 rounded-full border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/50 focus:outline-none"
                />
              )}
              <button
                onClick={handleSaveDisposition}
                disabled={!telephonyState.activeCustomerId || isSaving}
                className="flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#D44B2E] to-[#F5B021] px-5 text-xs font-bold text-black shadow-lg shadow-[#F5B021]/20 transition hover:opacity-90 disabled:opacity-40"
              >
                <Check className="size-3.5" />
                Save & Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
