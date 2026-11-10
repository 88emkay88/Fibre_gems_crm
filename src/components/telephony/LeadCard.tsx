import React from "react";
import { Phone, PhoneOff, MessageSquare, Copy, CalendarClock, AlertTriangle, Clock, PhoneCall, Radio } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";
import type { Customer } from "./types";
import { formatCallTime } from "./telephony-service";

interface LeadCardProps {
  customer: Customer;
  onCall: (customer: Customer) => void;
  onHangup?: (() => void) | undefined;
  onSelect?: ((customer: Customer) => void) | undefined;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  isDialing?: boolean;
  isDragging?: boolean;
  isArriving?: boolean;
  callDurationSeconds?: number;
}

function formatLastCall(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays > 1 && diffDays < 14) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export function LeadCard({
  customer,
  onCall,
  onHangup,
  onSelect,
  onPointerDown,
  isDialing = false,
  isDragging = false,
  isArriving = false,
  callDurationSeconds = 0,
}: LeadCardProps) {
  const normPhone = customer.cell_number.replace(/\D/g, "");
  const saPhone = normPhone.startsWith("0") ? `27${normPhone.slice(1)}` : normPhone;
  const name = customer.full_name || `${customer.first_name} ${customer.surname}`;

  const isExpired = React.useMemo(() => {
    if (!customer.easypay_expiry_date) return false;
    return new Date(customer.easypay_expiry_date).getTime() < Date.now();
  }, [customer.easypay_expiry_date]);

  const isPreviousClient = Boolean(
    customer.last_contact_date || (customer.status && customer.status !== "new_lead")
  );
  const lastCallText = formatLastCall(customer.last_contact_date);

  const copyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    void copyToClipboard(customer.cell_number);
    toast.success("Copied", { description: customer.cell_number });
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/${saPhone}`, "_blank", "noopener,noreferrer");
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCall(customer);
  };

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(customer);
    }
  };

  return (
    <article
      onPointerDown={onPointerDown}
      className={`group cursor-grab touch-none select-none rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 active:cursor-grabbing ${
        isDialing
          ? "border-[#22C55E] bg-[#22C55E]/10 shadow-[0_0_25px_rgba(34,197,94,0.3)] ring-2 ring-[#22C55E]/50"
          : isPreviousClient
          ? "border-[#F5B021]/30 bg-[#161410] hover:border-[#F5B021]/60 shadow-[0_4px_15px_rgba(0,0,0,0.4)]"
          : "border-white/5 bg-[#141414] hover:border-white/15"
      } ${isDragging ? "opacity-40" : ""} ${isArriving ? "animate-stage-arrive" : ""}`}
    >
      {/* Live Call Banner if active */}
      {isDialing && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-[#22C55E]/20 px-2 py-1 text-[11px] font-bold text-[#22C55E] border border-[#22C55E]/50">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#22C55E] animate-ping" />
            <Radio className="size-3.5 text-[#22C55E]" />
            LIVE CALL
          </span>
          <span className="font-mono text-xs tabular-nums text-white">
            {formatCallTime(callDurationSeconds)}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(customer);
            }}
            title="Click name to view and edit details"
            className="truncate text-sm font-semibold text-white hover:text-[#F5B021] cursor-pointer hover:underline transition-colors"
          >
            {name}
          </h4>
          <p className="truncate text-xs text-white/40">{customer.area_suburb || "—"}</p>
        </div>
        {customer.product_package && (
          <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
            {customer.product_package.replace("Vuma Reach ", "")}
          </span>
        )}
      </div>

      {/* Badges row: Previous Client, EasyPay, Expiry */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {/* Previous Client Badge (Yellow) */}
        {!isDialing && isPreviousClient && (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#F5B021]/15 px-2 py-0.5 text-[10px] font-bold text-[#F5B021] border border-[#F5B021]/30">
            <Clock className="size-2.5" />
            PREVIOUS CLIENT
          </span>
        )}

        {customer.easypay_number && (
          <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-[#F5B021]">
            EP {customer.easypay_number}
          </span>
        )}

        {isExpired && (
          <span className="inline-flex items-center gap-1 rounded-md bg-[#D44B2E]/15 px-2 py-0.5 text-[10px] font-bold text-[#D44B2E]">
            <AlertTriangle className="size-3" />
            EXPIRED
          </span>
        )}
      </div>

      {/* Last Call Info for Previous Client */}
      {lastCallText && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-[#F5B021]/80 bg-[#F5B021]/5 rounded-md px-2 py-0.5">
          <PhoneCall className="size-3 text-[#F5B021]" />
          <span>Last call: {lastCallText}</span>
        </div>
      )}

      {/* Next action scheduled */}
      {customer.next_action && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30">
          <CalendarClock className="size-3 shrink-0" />
          <span className="truncate">{customer.next_action}</span>
        </div>
      )}

      {/* Activated Referral Prompt */}
      {customer.status === "activated" && (
        <div className="mt-2 flex items-center justify-between gap-1.5 text-[10px] font-semibold text-[#22C55E] bg-[#22C55E]/10 rounded-md px-2 py-0.5 border border-[#22C55E]/20">
          <span>Activated · Ask Referrals</span>
          <span className="font-mono text-white/90">{customer.referral_code || "REF"}</span>
        </div>
      )}

      {/* Bottom bar */}
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
        <span className="font-mono text-[11px] text-white/40">{customer.cell_number}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyPhone}
            title="Copy number"
            className="grid size-6 place-items-center rounded-full text-white/30 transition hover:bg-white/5 hover:text-white/70"
          >
            <Copy className="size-3" />
          </button>
          <button
            type="button"
            onClick={openWhatsApp}
            title="WhatsApp"
            className="grid size-6 place-items-center rounded-full text-white/30 transition hover:bg-[#25D366]/10 hover:text-[#25D366]"
          >
            <MessageSquare className="size-3" />
          </button>
          {isDialing ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onHangup?.();
              }}
              title="Hang up active call"
              className="flex h-6 items-center gap-1 rounded-full bg-[#D44B2E] px-2.5 text-[11px] font-bold text-white shadow-md shadow-[#D44B2E]/30 transition hover:bg-[#D44B2E]/90 hover:scale-105 active:scale-95"
            >
              <PhoneOff className="size-2.5" />
              Hang Up
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCall}
              className="flex h-6 items-center gap-1 rounded-full bg-gradient-to-r from-[#D44B2E] to-[#F5B021] px-2.5 text-[11px] font-bold text-black transition hover:opacity-90 hover:scale-105 active:scale-95"
            >
              <Phone className="size-2.5" />
              Call
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
