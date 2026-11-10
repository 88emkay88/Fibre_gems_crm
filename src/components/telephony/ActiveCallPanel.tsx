import {
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import { Phone, Radio, Copy, Check, Sparkles, UserPlus, PhoneCall, AlertTriangle, PhoneOff } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";
import type { AgentTelephonyState, Customer } from "./types";
import { CallControls } from "./CallControls";
import { formatCallTime } from "./telephony-service";
import { stageForCustomer } from "./pipeline-stages";

const PANEL_WIDTH = 340;
const EDGE_MARGIN = 12;

type ActiveCallPanelProps = {
  telephonyState: AgentTelephonyState;
  setTelephonyState: Dispatch<SetStateAction<AgentTelephonyState>>;
  activeCustomer: Customer | null;
  onLogOutcome: () => void;
  onOpenCustomerDetails?: () => void;
  onCaptureReferral?: (customer: Customer) => void;
};

type Position = { x: number; y: number };

export function ActiveCallPanel({
  telephonyState,
  setTelephonyState,
  activeCustomer,
  onLogOutcome,
  onOpenCustomerDetails,
  onCaptureReferral,
}: ActiveCallPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOrigin = useRef<{
    pointerX: number;
    pointerY: number;
    left: number;
    top: number;
  } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, input, select")) return;
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOrigin.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      left: rect.left,
      top: rect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    const panel = panelRef.current;
    if (!origin || !panel) return;
    const maxX = window.innerWidth - panel.offsetWidth - EDGE_MARGIN;
    const maxY = window.innerHeight - panel.offsetHeight - EDGE_MARGIN;
    const x = Math.min(Math.max(origin.left + e.clientX - origin.pointerX, EDGE_MARGIN), maxX);
    const y = Math.min(Math.max(origin.top + e.clientY - origin.pointerY, EDGE_MARGIN), maxY);
    setPosition({ x, y });
  };

  const handlePointerUp = () => {
    dragOrigin.current = null;
  };

  const copyPhone = (phone?: string | null) => {
    if (!phone) return;
    void copyToClipboard(phone);
    setCopied(true);
    toast.success("Phone number copied", { description: phone });
    setTimeout(() => setCopied(false), 1500);
  };

  const placement = position ? { left: position.x, top: position.y } : { right: 24, bottom: 120 };
  const stage = stageForCustomer(activeCustomer);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Active call panel"
      style={{ ...placement, width: PANEL_WIDTH }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="fixed z-[9999] flex touch-none select-none cursor-grab flex-col gap-3 rounded-[24px] border border-white/10 bg-[#121212]/95 p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.85)] ring-1 ring-white/10 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300 active:cursor-grabbing"
    >
      {/* Status top indicators */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          {telephonyState.callProgress === "does_not_exist" ? (
            <span className="flex items-center gap-1.5 rounded-full bg-[#EF4444]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#EF4444] animate-pulse">
              <AlertTriangle className="size-3 text-[#EF4444]" />
              NUMBER DOES NOT EXIST
            </span>
          ) : telephonyState.callProgress === "ringing" ? (
            <span className="flex items-center gap-1.5 rounded-full bg-[#F5B021]/20 px-2.5 py-0.5 text-[11px] font-bold text-[#F5B021]">
              <PhoneCall className="size-3 text-[#F5B021] animate-bounce" />
              RINGING...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-[#22C55E]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#22C55E]">
              <span className="size-2 rounded-full bg-[#22C55E] animate-ping" />
              LIVE CALL
            </span>
          )}

          {telephonyState.callProgress !== "does_not_exist" && (
            <span className="flex items-center gap-1 rounded-full bg-[#D44B2E]/15 px-2 py-0.5 text-[10px] font-bold text-[#D44B2E]">
              <Radio className="size-2.5 animate-pulse" />
              REC
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${stage.tint} ${stage.text}`}
        >
          <span className={`size-1.5 rounded-full ${stage.accent}`} />
          <span className="truncate max-w-[120px]">{stage.title}</span>
        </span>
      </div>

      {/* Warning Box if Number Does Not Exist */}
      {telephonyState.callProgress === "does_not_exist" && (
        <div className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 p-3 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[#EF4444]">
            <AlertTriangle className="size-4 shrink-0" />
            <span>Unreachable / Invalid Number</span>
          </div>
          <p className="text-[11px] text-white/70 leading-relaxed">
            {telephonyState.callErrorReason || "The dialed number is invalid, unallocated, or disconnected."}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onLogOutcome}
              className="flex items-center gap-1 rounded-lg bg-[#EF4444] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-[#EF4444]/90 transition cursor-pointer"
            >
              <span>Dispo as Invalid</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTelephonyState((prev) => ({
                  ...prev,
                  agentStatus: "ready",
                  callProgress: null,
                  callErrorReason: null,
                }));
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/70 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Customer summary */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-base font-bold text-white">
            {telephonyState.activeCustomerName || activeCustomer?.full_name || "Active Lead"}
          </h4>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span>{telephonyState.activeCustomerPhone || activeCustomer?.cell_number || "—"}</span>
            <button
              type="button"
              onClick={() => copyPhone(telephonyState.activeCustomerPhone || activeCustomer?.cell_number)}
              className="text-white/40 hover:text-white transition"
              title="Copy phone"
            >
              {copied ? <Check className="size-3 text-[#22C55E]" /> : <Copy className="size-3" />}
            </button>
            {activeCustomer?.area_suburb && (
              <span className="truncate text-white/40">· {activeCustomer.area_suburb}</span>
            )}
          </div>
        </div>
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
          telephonyState.callProgress === "does_not_exist"
            ? "bg-[#EF4444]/20 text-[#EF4444]"
            : telephonyState.callProgress === "ringing"
            ? "bg-[#F5B021]/20 text-[#F5B021]"
            : "bg-[#22C55E]/15 text-[#22C55E]"
        }`}>
          {telephonyState.callProgress === "does_not_exist" ? (
            <PhoneOff className="size-5" />
          ) : telephonyState.callProgress === "ringing" ? (
            <PhoneCall className="size-5 animate-pulse" />
          ) : (
            <Phone className="size-5" />
          )}
        </span>
      </div>

      {/* Referral Pitch Section (Prominent when customer is activated) */}
      {(activeCustomer?.status === "activated" || activeCustomer?.referral_code) && (
        <div className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-2.5 text-xs space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between font-bold text-[#22C55E]">
            <span className="flex items-center gap-1.5 text-[11px]">
              <Sparkles className="size-3.5 animate-pulse" />
              {activeCustomer?.status === "activated" ? "Activated · Ask for Referrals" : "Referral Code"}
            </span>
            <span className="font-mono text-[11px] bg-black/60 px-2 py-0.5 rounded border border-[#22C55E]/30 text-white font-semibold">
              {activeCustomer?.referral_code || "REF-READY"}
            </span>
          </div>
          {activeCustomer?.status === "activated" && (
            <p className="text-[11px] text-white/80 italic leading-snug">
              "Who else among your friends, family or neighbours would also love fast fibre?"
            </p>
          )}
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                if (activeCustomer?.referral_code) {
                  void copyToClipboard(activeCustomer.referral_code);
                  toast.success("Referral code copied!", { description: activeCustomer.referral_code });
                }
              }}
              className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white/90 hover:bg-black/70 hover:text-white transition"
              title="Copy referral code"
            >
              <Copy className="size-3 text-[#F5B021]" />
              <span>Copy Code</span>
            </button>
            {onCaptureReferral && activeCustomer && (
              <button
                type="button"
                onClick={() => onCaptureReferral(activeCustomer)}
                className="flex items-center gap-1 rounded-lg bg-[#22C55E] px-2.5 py-1 text-[11px] font-bold text-black shadow-sm transition hover:bg-[#22C55E]/90 active:scale-95 ml-auto"
              >
                <UserPlus className="size-3" />
                <span>+ Referral Lead</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Timer / Progress Banner */}
      <div className="rounded-xl border border-white/5 bg-black/40 py-2.5 text-center">
        {telephonyState.callProgress === "does_not_exist" ? (
          <div className="flex items-center justify-center gap-1.5 py-1">
            <PhoneOff className="size-4 text-[#EF4444]" />
            <p className="font-mono text-sm font-bold tracking-wider text-[#EF4444]">
              CALL UNREACHABLE
            </p>
          </div>
        ) : telephonyState.callProgress === "ringing" ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-1">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#F5B021] animate-ping" />
              <p className="font-mono text-base font-bold tracking-wider text-[#F5B021]">
                RINGING...
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setTelephonyState((prev) => ({
                  ...prev,
                  callProgress: "connected",
                  callDurationSeconds: 1,
                }));
                toast.success("Call connected! Timer started.");
              }}
              className="mt-1 flex items-center gap-1.5 rounded-lg bg-[#22C55E] px-3 py-1 text-xs font-bold text-black shadow-sm transition hover:bg-[#22C55E]/90 active:scale-95 cursor-pointer"
            >
              <Phone className="size-3" />
              <span>Customer Answered</span>
            </button>
          </div>
        ) : (
          <p className="font-mono text-3xl font-extrabold tracking-wider tabular-nums text-white">
            {formatCallTime(telephonyState.callDurationSeconds)}
          </p>
        )}
      </div>

      {/* Controls */}
      <CallControls
        telephonyState={telephonyState}
        setTelephonyState={setTelephonyState}
        onLogOutcome={onLogOutcome}
        onOpenCustomerDetails={onOpenCustomerDetails}
      />
    </div>
  );
}
