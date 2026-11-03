import React, { useState, useEffect } from "react";
import { PhoneOff, Mic, MicOff, Pause, Play, Check, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AgentTelephonyState } from "./types";
import {
  hangupCallApi,
  setAgentStatusApi,
  submitDispositionApi,
  tomorrowInJohannesburg,
} from "./telephony-service";

const PAUSE_CODES = ["LUNCH", "TEA", "MEETING", "TRAINING", "WRAPUP"];
const DISPOSITIONS = [
  { value: "SALE", label: "Sale won" },
  { value: "CALLBACK", label: "Callback" },
  { value: "PAYMENT_PROMISED", label: "Payment promised" },
  { value: "NI", label: "Not interested" },
  { value: "DNC", label: "Do not call" },
];

interface SoftphoneBarProps {
  telephonyState: AgentTelephonyState;
  setTelephonyState: React.Dispatch<React.SetStateAction<AgentTelephonyState>>;
  onDispositionComplete?: () => void;
}

const formatTime = (secs: number) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export function SoftphoneBar({
  telephonyState,
  setTelephonyState,
  onDispositionComplete,
}: SoftphoneBarProps) {
  const [selectedDispo, setSelectedDispo] = useState("SALE");
  const [callbackDate, setCallbackDate] = useState(tomorrowInJohannesburg);
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);

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

  const handleHangup = async () => {
    await hangupCallApi(telephonyState.activeCustomerId);
    setTelephonyState((prev) => ({ ...prev, agentStatus: "ready", isOnHold: false }));
    toast.info("Call ended. Please choose an outcome.");
  };

  const handleSaveDisposition = async () => {
    if (!telephonyState.activeCustomerId) {
      toast.error("No active customer for this outcome");
      return;
    }
    if (selectedDispo === "CALLBACK" && !callbackDate) {
      toast.error("Pick a callback date");
      return;
    }

    await submitDispositionApi({
      customerId: telephonyState.activeCustomerId,
      disposition: selectedDispo,
      notes: `Softphone outcome: ${selectedDispo}`,
      callbackDate: selectedDispo === "CALLBACK" ? callbackDate : null,
    });

    setTelephonyState((prev) => ({
      ...prev,
      activeCustomerId: null,
      activeCustomerName: null,
      activeCustomerPhone: null,
      callDurationSeconds: 0,
      agentStatus: "ready",
    }));

    onDispositionComplete?.();
  };

  const toggleMute = () => {
    setTelephonyState((prev) => {
      const next = !prev.isMuted;
      toast(next ? "Microphone muted" : "Microphone on");
      return { ...prev, isMuted: next };
    });
  };

  const toggleHold = () => {
    setTelephonyState((prev) => {
      const next = !prev.isOnHold;
      toast(next ? "Caller on hold" : "Call resumed");
      return { ...prev, isOnHold: next };
    });
  };

  const statusDot =
    telephonyState.agentStatus === "in_call"
      ? "bg-destructive"
      : telephonyState.agentStatus === "paused"
        ? "bg-secondary"
        : "bg-success";

  const statusLabel =
    telephonyState.agentStatus === "in_call"
      ? "On call"
      : telephonyState.agentStatus === "dialing"
        ? "Dialing"
        : telephonyState.agentStatus === "paused"
          ? `On break${telephonyState.pauseCode ? ` · ${telephonyState.pauseCode}` : ""}`
          : "Ready";

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
      <div className="flex flex-col gap-3 rounded-3xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-1">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className={`size-2.5 shrink-0 rounded-full ${statusDot} ${isCallActive ? "animate-pulse" : ""}`}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {isCallActive ? telephonyState.activeCustomerName || "Active lead" : statusLabel}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {isCallActive
                  ? telephonyState.activeCustomerPhone || ""
                  : "Choose Call on a lead to start"}
              </p>
            </div>
          </div>

          {isCallActive ? (
            <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {formatTime(telephonyState.callDurationSeconds)}
            </span>
          ) : (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPauseMenuOpen((open) => !open)}
                className="h-8 rounded-full bg-card text-xs"
              >
                {telephonyState.agentStatus === "paused" ? "Resume" : "Break"}
                <ChevronDown />
              </Button>
              {pauseMenuOpen && (
                <div className="absolute bottom-11 right-0 w-44 rounded-2xl border border-border bg-popover p-1.5 shadow-xl">
                  {telephonyState.agentStatus === "paused" ? (
                    <button
                      onClick={() => handleTogglePause()}
                      className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-success hover:bg-muted"
                    >
                      Back to ready
                    </button>
                  ) : (
                    PAUSE_CODES.map((code) => (
                      <button
                        key={code}
                        onClick={() => handleTogglePause(code)}
                        className="w-full rounded-xl px-3 py-2 text-left text-xs text-foreground hover:bg-muted"
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

        {isCallActive ? (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={telephonyState.isMuted ? "secondary" : "outline"}
              size="icon"
              onClick={toggleMute}
              aria-label={telephonyState.isMuted ? "Unmute" : "Mute"}
              className="size-11 rounded-full bg-card"
            >
              {telephonyState.isMuted ? <MicOff /> : <Mic />}
            </Button>
            <Button
              variant={telephonyState.isOnHold ? "secondary" : "outline"}
              size="icon"
              onClick={toggleHold}
              aria-label={telephonyState.isOnHold ? "Resume call" : "Hold"}
              className="size-11 rounded-full bg-card"
            >
              {telephonyState.isOnHold ? <Play /> : <Pause />}
            </Button>
            <Button
              variant="destructive"
              onClick={handleHangup}
              className="h-11 gap-2 rounded-full px-6 font-semibold"
            >
              <PhoneOff />
              Hang up
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={selectedDispo}
              onChange={(e) => setSelectedDispo(e.target.value)}
              disabled={!telephonyState.activeCustomerId}
              aria-label="Outcome"
              className="h-10 flex-1 rounded-full border border-input bg-card px-4 text-sm text-foreground disabled:opacity-50"
            >
              {DISPOSITIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            {selectedDispo === "CALLBACK" && (
              <input
                type="date"
                value={callbackDate}
                min={tomorrowInJohannesburg()}
                onChange={(e) => setCallbackDate(e.target.value)}
                aria-label="Callback date"
                required
                className="h-10 rounded-full border border-input bg-card px-3 text-sm text-foreground"
              />
            )}
            <Button
              onClick={handleSaveDisposition}
              disabled={!telephonyState.activeCustomerId}
              className="h-10 gap-1.5 rounded-full px-5"
            >
              <Check />
              Save and next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
