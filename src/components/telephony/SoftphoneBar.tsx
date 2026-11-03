import React, { useState, useEffect } from "react";
import { PictureInPicture2, Check, ChevronDown, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AgentTelephonyState } from "./types";
import {
  formatCallTime,
  jhbDateOffset,
  setAgentStatusApi,
  submitDispositionApi,
} from "./telephony-service";
import { CallControls } from "./CallControls";
import { ActiveCallPanel } from "./ActiveCallPanel";

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
  onDispositionComplete?: (customerId: string) => void;
}

export function SoftphoneBar({
  telephonyState,
  setTelephonyState,
  onDispositionComplete,
}: SoftphoneBarProps) {
  const [selectedDispo, setSelectedDispo] = useState("SALE");
  const [callbackDate, setCallbackDate] = useState(() => jhbDateOffset(1));
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);
  const [callLayout, setCallLayout] = useState<"dock" | "float">("dock");
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
    const needsDate = selectedDispo !== "NI" && selectedDispo !== "DNC";
    if (needsDate && !callbackDate) {
      toast.error("Pick a next action date");
      return;
    }

    setIsSaving(true);
    try {
      await submitDispositionApi({
        customerId: savedCustomerId,
        disposition: selectedDispo,
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
    <>
      {isCallActive && callLayout === "float" && (
        <ActiveCallPanel
          telephonyState={telephonyState}
          setTelephonyState={setTelephonyState}
          onDock={() => setCallLayout("dock")}
        />
      )}

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
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
                  {formatCallTime(telephonyState.callDurationSeconds)}
                </span>
                {callLayout === "dock" && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCallLayout("float")}
                    aria-label="Pop out call panel"
                    className="size-8 rounded-full bg-card"
                  >
                    <PictureInPicture2 className="size-4" />
                  </Button>
                )}
              </div>
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

          {isCallActive && callLayout === "dock" && (
            <CallControls telephonyState={telephonyState} setTelephonyState={setTelephonyState} />
          )}

          {isCallActive && callLayout === "float" && (
            <p className="flex items-center justify-center gap-2 px-1 pb-1 text-xs text-muted-foreground">
              <Phone className="size-3.5" />
              Call controls are in the floating panel
            </p>
          )}

          {!isCallActive && (
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
              {selectedDispo !== "NI" && selectedDispo !== "DNC" && (
                <input
                  type="date"
                  value={callbackDate}
                  min={jhbDateOffset(0)}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  aria-label="Next action date"
                  required
                  className="h-10 rounded-full border border-input bg-card px-3 text-sm text-foreground"
                />
              )}
              <Button
                onClick={handleSaveDisposition}
                disabled={!telephonyState.activeCustomerId || isSaving}
                className="h-10 gap-1.5 rounded-full px-5"
              >
                <Check />
                Save and next
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
