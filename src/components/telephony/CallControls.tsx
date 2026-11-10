import { useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, Mic, MicOff, Pause, Play, PhoneOff, ShieldAlert, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgentTelephonyState } from "./types";
import {
  ESCALATION_LEVELS,
  escalateLeadApi,
  hangupCallApi,
  setCallHoldApi,
  setCallMuteApi,
} from "./telephony-service";

type CallControlsProps = {
  telephonyState: AgentTelephonyState;
  setTelephonyState: Dispatch<SetStateAction<AgentTelephonyState>>;
  onLogOutcome: () => void;
  onOpenCustomerDetails?: () => void;
};

const controlClass =
  "flex h-auto flex-col gap-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-xs font-semibold text-white/90 transition hover:bg-white/10 hover:border-white/20 active:scale-95 disabled:opacity-50";

export async function endActiveCall(
  setTelephonyState: Dispatch<SetStateAction<AgentTelephonyState>>,
) {
  if (!(await hangupCallApi())) return;
  setTelephonyState((prev) => {
    const outcomeAlreadyLogged = Boolean(prev.outcomeLoggedForCall);
    if (outcomeAlreadyLogged) {
      toast.info("Call ended.");
      return {
        ...prev,
        agentStatus: "ready",
        isOnHold: false,
        isMuted: false,
        callDurationSeconds: 0,
        activeCustomerId: null,
        activeCustomerName: null,
        activeCustomerPhone: null,
        outcomeLoggedForCall: false,
      };
    } else {
      toast.info("Call ended. Choose an outcome to continue.");
      return {
        ...prev,
        agentStatus: "ready",
        isOnHold: false,
        isMuted: false,
        callDurationSeconds: 0,
      };
    }
  });
}

export function CallControls({
  telephonyState,
  setTelephonyState,
  onLogOutcome,
  onOpenCustomerDetails,
}: CallControlsProps) {
  const qc = useQueryClient();
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateLevel, setEscalateLevel] = useState(ESCALATION_LEVELS[0] ?? "");
  const [escalateReason, setEscalateReason] = useState("");
  const [isEscalating, setIsEscalating] = useState(false);

  const toggleMute = async () => {
    const next = !telephonyState.isMuted;
    if (!(await setCallMuteApi(next))) return;
    setTelephonyState((prev) => ({ ...prev, isMuted: next }));
  };

  const toggleHold = async () => {
    const next = !telephonyState.isOnHold;
    if (!(await setCallHoldApi(next))) return;
    setTelephonyState((prev) => ({ ...prev, isOnHold: next }));
    toast(next ? "Caller on hold" : "Call resumed");
  };

  const submitEscalation = async () => {
    const customerId = telephonyState.activeCustomerId;
    const reason = escalateReason.trim();
    if (!customerId || !reason) return;
    setIsEscalating(true);
    try {
      await escalateLeadApi(customerId, escalateLevel, reason);
      setEscalateOpen(false);
      setEscalateReason("");
      await qc.invalidateQueries({ queryKey: ["crm-workspace"] });
    } catch (err) {
      toast.error("Escalation failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsEscalating(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      {onOpenCustomerDetails && (
        <button
          type="button"
          onClick={onOpenCustomerDetails}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#F5B021]/50 bg-[#F5B021]/15 px-3 text-xs font-bold text-[#F5B021] shadow-sm transition hover:bg-[#F5B021]/25 hover:border-[#F5B021] active:scale-98"
        >
          <UserCog className="size-4" />
          <span>Update Lead & Customer Details</span>
        </button>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={telephonyState.isMuted ? "Unmute" : "Mute"}
          className={`${controlClass} ${telephonyState.isMuted ? "border-[#D44B2E] text-[#D44B2E] bg-[#D44B2E]/10" : ""}`}
        >
          {telephonyState.isMuted ? <MicOff className="size-4 text-[#D44B2E]" /> : <Mic className="size-4 text-white/80" />}
          <span>{telephonyState.isMuted ? "Unmute" : "Mute"}</span>
        </button>
        <button
          type="button"
          onClick={toggleHold}
          aria-label={telephonyState.isOnHold ? "Resume call" : "Hold"}
          className={`${controlClass} ${telephonyState.isOnHold ? "border-[#F5B021] text-[#F5B021] bg-[#F5B021]/10" : ""}`}
        >
          {telephonyState.isOnHold ? <Play className="size-4 text-[#F5B021]" /> : <Pause className="size-4 text-white/80" />}
          <span>{telephonyState.isOnHold ? "Resume" : "Hold"}</span>
        </button>
        <button
          type="button"
          onClick={() => setEscalateOpen((open) => !open)}
          aria-expanded={escalateOpen}
          className={`${controlClass} ${escalateOpen ? "border-white/40 bg-white/10" : ""}`}
        >
          <ShieldAlert className="size-4 text-white/80" />
          <span>Escalate</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onLogOutcome}
          className={`flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold transition active:scale-95 ${
            telephonyState.outcomeLoggedForCall
              ? "border border-[#22C55E]/50 bg-[#22C55E]/20 text-[#22C55E] hover:bg-[#22C55E]/30"
              : "bg-[#F5B021] text-black shadow-md shadow-[#F5B021]/20 hover:bg-[#F5B021]/90"
          }`}
        >
          <ClipboardCheck className="size-4" />
          <span>{telephonyState.outcomeLoggedForCall ? "Outcome Logged ✓" : "Log outcome"}</span>
        </button>
        <button
          type="button"
          onClick={() => endActiveCall(setTelephonyState)}
          aria-label="Hang up"
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#D44B2E] px-3 text-xs font-bold text-white shadow-md shadow-[#D44B2E]/20 transition hover:bg-[#D44B2E]/90 active:scale-95"
        >
          <PhoneOff className="size-4" />
          <span>Hang up</span>
        </button>
      </div>

      {escalateOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#161616] p-3 text-white animate-in fade-in slide-in-from-top-1">
          <select
            value={escalateLevel}
            onChange={(e) => setEscalateLevel(e.target.value)}
            aria-label="Escalation level"
            className="h-9 rounded-lg border border-white/10 bg-[#1e1e1e] px-2.5 text-xs text-white"
          >
            {ESCALATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <Input
            value={escalateReason}
            onChange={(e) => setEscalateReason(e.target.value)}
            placeholder="Reason for escalation"
            aria-label="Escalation reason"
            className="h-9 rounded-lg border-white/10 bg-[#1e1e1e] text-xs text-white"
          />
          <p className="text-[11px] text-white/50">
            Escalated leads leave your active stack until supervisor review.
          </p>
          <Button
            size="sm"
            onClick={submitEscalation}
            disabled={isEscalating || !escalateReason.trim()}
            className="h-8 rounded-lg bg-[#D44B2E] text-xs font-semibold text-white hover:bg-[#D44B2E]/90"
          >
            Confirm escalation
          </Button>
        </div>
      )}
    </div>
  );
}
