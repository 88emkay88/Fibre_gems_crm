import { useState, type Dispatch, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardCheck, Mic, MicOff, Pause, Play, PhoneOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgentTelephonyState } from "./types";
import {
  ESCALATION_LEVELS,
  escalateLeadApi,
  formatCallTime,
  hangupCallApi,
  setCallHoldApi,
  setCallMuteApi,
} from "./telephony-service";

type CallControlsProps = {
  telephonyState: AgentTelephonyState;
  setTelephonyState: Dispatch<SetStateAction<AgentTelephonyState>>;
  onLogOutcome: () => void;
};

const controlClass =
  "flex h-auto flex-col gap-1.5 rounded-2xl bg-muted/60 px-2 py-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50";

export async function endActiveCall(
  setTelephonyState: Dispatch<SetStateAction<AgentTelephonyState>>,
) {
  if (!(await hangupCallApi())) return;
  setTelephonyState((prev) => ({
    ...prev,
    agentStatus: "ready",
    isOnHold: false,
    isMuted: false,
  }));
  toast.info("Call ended. Choose an outcome to continue.");
}

export function CallControls({ telephonyState, setTelephonyState, onLogOutcome }: CallControlsProps) {
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
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="ghost"
          onClick={toggleMute}
          aria-label={telephonyState.isMuted ? "Unmute" : "Mute"}
          className={`${controlClass} ${telephonyState.isMuted ? "text-destructive" : "text-foreground"}`}
        >
          {telephonyState.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          {telephonyState.isMuted ? "Unmute" : "Mute"}
        </Button>
        <Button
          variant="ghost"
          onClick={toggleHold}
          aria-label={telephonyState.isOnHold ? "Resume call" : "Hold"}
          className={`${controlClass} text-foreground`}
        >
          {telephonyState.isOnHold ? <Play className="size-4" /> : <Pause className="size-4" />}
          {telephonyState.isOnHold ? "Resume" : "Hold"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => setEscalateOpen((open) => !open)}
          aria-expanded={escalateOpen}
          className={`${controlClass} text-foreground`}
        >
          <ShieldAlert className="size-4" />
          Escalate
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onLogOutcome} className="h-11 rounded-2xl text-sm font-semibold">
          <ClipboardCheck className="size-4" />
          Log outcome
        </Button>
        <Button
          variant="destructive"
          onClick={() => endActiveCall(setTelephonyState)}
          aria-label="Hang up"
          className="h-11 rounded-2xl text-sm font-semibold"
        >
          <PhoneOff className="size-4" />
          Hang up
        </Button>
      </div>

      {escalateOpen && (
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
          <select
            value={escalateLevel}
            onChange={(e) => setEscalateLevel(e.target.value)}
            aria-label="Escalation level"
            className="h-9 rounded-xl border border-input bg-card px-3 text-sm text-foreground"
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
            className="h-9 rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Escalated customers leave the call stack until a supervisor reviews them.
          </p>
          <Button
            onClick={submitEscalation}
            disabled={isEscalating || !escalateReason.trim()}
            className="h-9 rounded-xl"
          >
            Confirm escalation
          </Button>
        </div>
      )}
    </div>
  );
}
