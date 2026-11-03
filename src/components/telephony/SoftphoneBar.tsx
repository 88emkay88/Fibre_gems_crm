import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  Check,
  ChevronDown,
  Sparkles,
  PhoneForwarded,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { AgentTelephonyState } from "./types";
import { hangupCallApi, setAgentStatusApi, submitDispositionApi } from "./telephony-service";

interface SoftphoneBarProps {
  telephonyState: AgentTelephonyState;
  setTelephonyState: React.Dispatch<React.SetStateAction<AgentTelephonyState>>;
  onDispositionComplete?: () => void;
}

export function SoftphoneBar({
  telephonyState,
  setTelephonyState,
  onDispositionComplete,
}: SoftphoneBarProps) {
  const [selectedDispo, setSelectedDispo] = useState("SALE");
  const [pauseMenuOpen, setPauseMenuOpen] = useState(false);

  // Live Call Timer Ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (telephonyState.agentStatus === "in_call") {
      interval = setInterval(() => {
        setTelephonyState((prev) => ({
          ...prev,
          callDurationSeconds: prev.callDurationSeconds + 1,
        }));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [telephonyState.agentStatus, setTelephonyState]);

  // Format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleTogglePause = async (code?: string) => {
    const newStatus = telephonyState.agentStatus === "paused" ? "ready" : "paused";
    setPauseMenuOpen(false);
    await setAgentStatusApi(newStatus, code);
    setTelephonyState((prev) => ({
      ...prev,
      agentStatus: newStatus,
      pauseCode: newStatus === "paused" ? code || "LUNCH" : null,
    }));
    toast.info(`Agent status: ${newStatus.toUpperCase()}`, {
      description: code ? `Code: ${code}` : undefined,
    });
  };

  const handleHangup = async () => {
    await hangupCallApi(telephonyState.activeCustomerId);
    setTelephonyState((prev) => ({
      ...prev,
      agentStatus: "ready",
      isOnHold: false,
    }));
    toast.info("Call Disconnected — Please disposition the outcome");
  };

  const handleSaveDisposition = async () => {
    if (!telephonyState.activeCustomerId) {
      toast.error("No active customer selected for disposition");
      return;
    }

    await submitDispositionApi({
      customerId: telephonyState.activeCustomerId,
      disposition: selectedDispo,
      notes: `ViciDial Softphone Dispo: ${selectedDispo}`,
    });

    setTelephonyState((prev) => ({
      ...prev,
      activeCustomerId: null,
      activeCustomerName: null,
      activeCustomerPhone: null,
      callDurationSeconds: 0,
      agentStatus: "ready",
    }));

    if (onDispositionComplete) onDispositionComplete();
  };

  const toggleMute = () => {
    setTelephonyState((prev) => {
      const next = !prev.isMuted;
      toast(next ? "Microphone Muted" : "Microphone Active");
      return { ...prev, isMuted: next };
    });
  };

  const toggleHold = () => {
    setTelephonyState((prev) => {
      const next = !prev.isOnHold;
      toast(next ? "Customer on Hold (Music playing)" : "Call Resumed");
      return { ...prev, isOnHold: next };
    });
  };

  const isCallActive =
    telephonyState.agentStatus === "in_call" || telephonyState.agentStatus === "dialing";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between text-slate-100 shadow-2xl">
      {/* 1. Left: Agent Status Pill & Pause Controls */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {telephonyState.agentStatus === "in_call" ? (
            <div className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-400">
              <span className="size-2 rounded-full bg-rose-500 animate-pulse" />
              <span>IN-CALL</span>
            </div>
          ) : telephonyState.agentStatus === "dialing" ? (
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400">
              <span className="size-2 rounded-full bg-amber-500 animate-spin" />
              <span>DIALING...</span>
            </div>
          ) : telephonyState.agentStatus === "paused" ? (
            <button
              onClick={() => handleTogglePause()}
              className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              <Pause className="size-3" />
              <span>PAUSED ({telephonyState.pauseCode || "AWAY"})</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>READY (ViciDial)</span>
            </div>
          )}
        </div>

        {/* Pause dropdown when idle */}
        {!isCallActive && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPauseMenuOpen(!pauseMenuOpen)}
              className="h-8 gap-1 text-xs text-slate-400 hover:text-white"
            >
              <span>{telephonyState.agentStatus === "paused" ? "Resume" : "Break"}</span>
              <ChevronDown className="size-3" />
            </Button>

            {pauseMenuOpen && (
              <div className="absolute bottom-10 left-0 w-36 rounded-lg border border-slate-800 bg-slate-900 p-1 shadow-xl">
                {telephonyState.agentStatus === "paused" ? (
                  <button
                    onClick={() => handleTogglePause()}
                    className="w-full rounded px-2.5 py-1.5 text-left text-xs font-semibold text-emerald-400 hover:bg-slate-800"
                  >
                    ▶ Resume Ready
                  </button>
                ) : (
                  ["LUNCH", "TEA", "MEETING", "TRAINING", "WRAPUP"].map((code) => (
                    <button
                      key={code}
                      onClick={() => handleTogglePause(code)}
                      className="w-full rounded px-2.5 py-1 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-white"
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

      {/* 2. Center: Live Call Monitor & Audio Controls */}
      <div className="flex items-center gap-4">
        {isCallActive ? (
          <>
            <div className="text-right">
              <p className="text-xs font-bold text-white truncate max-w-[180px]">
                {telephonyState.activeCustomerName || "Active Lead"}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                {telephonyState.activeCustomerPhone || "082..."}
              </p>
            </div>

            {/* Live Timer */}
            <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1 font-mono text-sm font-bold text-emerald-400">
              {formatTime(telephonyState.callDurationSeconds)}
            </div>

            {/* Audio Controls */}
            <div className="flex items-center gap-1.5">
              <Button
                variant={telephonyState.isMuted ? "destructive" : "outline"}
                size="icon"
                onClick={toggleMute}
                className="size-8 rounded-lg border-slate-800"
                title={telephonyState.isMuted ? "Unmute" : "Mute"}
              >
                {telephonyState.isMuted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
              </Button>

              <Button
                variant={telephonyState.isOnHold ? "destructive" : "outline"}
                size="icon"
                onClick={toggleHold}
                className="size-8 rounded-lg border-slate-800"
                title={telephonyState.isOnHold ? "Unhold" : "Hold"}
              >
                <Pause className="size-3.5" />
              </Button>

              {/* Big Red Hang Up Button */}
              <Button
                variant="destructive"
                size="sm"
                onClick={handleHangup}
                className="gap-1.5 rounded-lg px-3.5 font-bold shadow-lg shadow-rose-900/30 active:scale-95 transition-transform"
              >
                <PhoneOff className="size-3.5" />
                <span>Hang Up</span>
              </Button>
            </div>
          </>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Phone className="size-3.5 text-slate-600" />
            <span>Softphone Idle — Click "Call" on any lead card to dial</span>
          </div>
        )}
      </div>

      {/* 3. Right: Quick Disposition Selector */}
      <div className="flex items-center gap-2">
        <select
          value={selectedDispo}
          onChange={(e) => setSelectedDispo(e.target.value)}
          className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2.5 text-xs font-semibold text-slate-200 focus:outline-none"
        >
          <option value="SALE">SALE (Sale Won)</option>
          <option value="CALLBACK">CALLBACK (Reschedule)</option>
          <option value="PAYMENT_PROMISED">PAYMENT PROMISED</option>
          <option value="NI">NI (Not Interested)</option>
          <option value="DNC">DNC (Do Not Call)</option>
        </select>

        <Button
          size="sm"
          onClick={handleSaveDisposition}
          disabled={!telephonyState.activeCustomerId}
          className="h-8 gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          <Check className="size-3.5" />
          <span>Save & Next</span>
        </Button>
      </div>
    </div>
  );
}

