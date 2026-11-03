import React from "react";
import { Phone, MessageSquare, Copy, CalendarClock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { Customer } from "./types";

interface LeadCardProps {
  customer: Customer;
  onCall: (customer: Customer) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  isDialing?: boolean;
  isDragging?: boolean;
}

export function LeadCard({
  customer,
  onCall,
  onPointerDown,
  isDialing = false,
  isDragging = false,
}: LeadCardProps) {
  const normPhone = customer.cell_number.replace(/\D/g, "");
  const saPhone = normPhone.startsWith("0") ? `27${normPhone.slice(1)}` : normPhone;
  const name = customer.full_name || `${customer.first_name} ${customer.surname}`;

  const isExpired = React.useMemo(() => {
    if (!customer.easypay_expiry_date) return false;
    return new Date(customer.easypay_expiry_date).getTime() < Date.now();
  }, [customer.easypay_expiry_date]);

  const copyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(customer.cell_number);
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

  return (
    <article
      onPointerDown={onPointerDown}
      className={`group cursor-grab touch-none select-none rounded-xl border bg-[#141414] p-3 transition-all duration-200 hover:-translate-y-0.5 active:cursor-grabbing ${
        isDialing
          ? "border-[#F5B021]/30 shadow-[0_0_20px_rgba(245,176,33,0.15)]"
          : "border-white/5 hover:border-white/10"
      } ${isDragging ? "opacity-40" : ""}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-white">{name}</h4>
          <p className="truncate text-xs text-white/40">{customer.area_suburb || "—"}</p>
        </div>
        {customer.product_package && (
          <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/40">
            {customer.product_package.replace("Vuma Reach ", "")}
          </span>
        )}
      </div>

      {/* EasyPay + expiry */}
      {(customer.easypay_number || isExpired) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
      )}

      {/* Next action */}
      {customer.next_action && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/30">
          <CalendarClock className="size-3 shrink-0" />
          <span className="truncate">{customer.next_action}</span>
        </div>
      )}

      {/* Bottom bar */}
      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5">
        <span className="font-mono text-[11px] text-white/30">{customer.cell_number}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={copyPhone}
            title="Copy number"
            className="grid size-6 place-items-center rounded-full text-white/30 transition hover:bg-white/5 hover:text-white/70"
          >
            <Copy className="size-3" />
          </button>
          <button
            onClick={openWhatsApp}
            title="WhatsApp"
            className="grid size-6 place-items-center rounded-full text-white/30 transition hover:bg-[#25D366]/10 hover:text-[#25D366]"
          >
            <MessageSquare className="size-3" />
          </button>
          <button
            onClick={handleCall}
            disabled={isDialing}
            className={`flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold transition disabled:opacity-40 ${
              isDialing
                ? "bg-[#F5B021]/20 text-[#F5B021]"
                : "bg-gradient-to-r from-[#D44B2E] to-[#F5B021] text-black hover:opacity-90"
            }`}
          >
            <Phone className={`size-2.5 ${isDialing ? "animate-pulse" : ""}`} />
            {isDialing ? "Dialing" : "Call"}
          </button>
        </div>
      </div>
    </article>
  );
}
