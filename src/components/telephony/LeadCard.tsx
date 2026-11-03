import React from "react";
import { Phone, MessageSquare, Copy, Calendar, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Customer } from "./types";

interface LeadCardProps {
  customer: Customer;
  onSelect: (customer: Customer) => void;
  onCall: (customer: Customer) => void;
  isDialing?: boolean;
}

export function LeadCard({ customer, onSelect, onCall, isDialing = false }: LeadCardProps) {
  const normPhone = customer.cell_number.replace(/\D/g, "");
  const saPhone = normPhone.startsWith("0") ? `27${normPhone.slice(1)}` : normPhone;

  // Check EasyPay Expiry
  const isExpired = React.useMemo(() => {
    if (!customer.easypay_expiry_date) return false;
    const expiry = new Date(customer.easypay_expiry_date).getTime();
    return expiry < Date.now();
  }, [customer.easypay_expiry_date]);

  const copyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(customer.cell_number);
    toast.success("Phone number copied", { description: customer.cell_number });
  };

  const openWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://wa.me/${saPhone}`, "_blank");
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCall(customer);
  };

  return (
    <div
      onClick={() => onSelect(customer)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", customer.id);
      }}
      className={`group relative cursor-grab rounded-xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm transition-all hover:border-slate-700 hover:bg-slate-800/80 hover:shadow-md active:cursor-grabbing ${
        isDialing ? "ring-2 ring-primary ring-offset-2 ring-offset-slate-950" : ""
      }`}
    >
      {/* Top Row: Name and Suburb */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-slate-100 group-hover:text-primary transition-colors">
            {customer.full_name || `${customer.first_name} ${customer.surname}`}
          </h4>
          <p className="text-xs text-slate-400 truncate">{customer.area_suburb || "Area unassigned"}</p>
        </div>

        {/* Product / Status badge */}
        {customer.product_package && (
          <span className="shrink-0 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
            {customer.product_package.replace("Vuma Reach ", "")}
          </span>
        )}
      </div>

      {/* EasyPay / Expiry Warnings */}
      {(customer.easypay_number || isExpired) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          {customer.easypay_number && (
            <span className="rounded bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-400">
              EP: {customer.easypay_number}
            </span>
          )}
          {customer.easypay_cycle && (
            <span className="text-[10px] text-slate-400">({customer.easypay_cycle})</span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-400">
              <AlertTriangle className="size-3" />
              (EXPIRED)
            </span>
          )}
        </div>
      )}

      {/* Next Action / Callback Due */}
      {customer.next_action && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-400/90">
          <Calendar className="size-3.5 shrink-0" />
          <span className="truncate">{customer.next_action}</span>
          {customer.next_action_date && (
            <span className="shrink-0 text-slate-500">· {customer.next_action_date}</span>
          )}
        </div>
      )}

      {/* Action Footer: Phone & Quick 1-Click Action Buttons */}
      <div className="mt-3.5 flex items-center justify-between border-t border-slate-800/80 pt-2.5">
        <span className="font-mono text-xs font-medium text-slate-300">{customer.cell_number}</span>

        <div className="flex items-center gap-1">
          {/* Copy Number */}
          <Button
            variant="ghost"
            size="icon"
            onClick={copyPhone}
            title="Copy Number"
            className="size-7 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <Copy className="size-3.5" />
          </Button>

          {/* WhatsApp */}
          <Button
            variant="ghost"
            size="icon"
            onClick={openWhatsApp}
            title="WhatsApp Chat"
            className="size-7 rounded-md text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
          >
            <MessageSquare className="size-3.5" />
          </Button>

          {/* 1-Click Call Button */}
          <Button
            size="sm"
            onClick={handleCall}
            disabled={isDialing}
            className="h-7 gap-1 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-500 active:scale-95 transition-transform"
          >
            <Phone className={`size-3 ${isDialing ? "animate-spin" : ""}`} />
            <span>Call</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

