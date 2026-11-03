import React from "react";
import { Phone, MessageSquare, Copy, CalendarClock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
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
  const name = customer.full_name || `${customer.first_name} ${customer.surname}`;

  const isExpired = React.useMemo(() => {
    if (!customer.easypay_expiry_date) return false;
    return new Date(customer.easypay_expiry_date).getTime() < Date.now();
  }, [customer.easypay_expiry_date]);

  const copyPhone = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(customer.cell_number);
    toast.success("Phone number copied", { description: customer.cell_number });
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
      onClick={() => onSelect(customer)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", customer.id)}
      className={`group cursor-grab rounded-2xl border bg-card p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${
        isDialing ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-foreground">{name}</h4>
          <p className="truncate text-xs text-muted-foreground">
            {customer.area_suburb || "Area not set"}
          </p>
        </div>
        {customer.product_package && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {customer.product_package.replace("Vuma Reach ", "")}
          </span>
        )}
      </div>

      {(customer.easypay_number || isExpired) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
          {customer.easypay_number && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              EP {customer.easypay_number}
            </span>
          )}
          {isExpired && (
            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">
              <AlertTriangle className="size-3" />
              Expired
            </span>
          )}
        </div>
      )}

      {customer.next_action && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          <span className="truncate">{customer.next_action}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="font-mono text-xs text-muted-foreground">{customer.cell_number}</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={copyPhone}
            title="Copy number"
            aria-label="Copy number"
            className="size-7 rounded-full"
          >
            <Copy className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={openWhatsApp}
            title="WhatsApp"
            aria-label="WhatsApp"
            className="size-7 rounded-full"
          >
            <MessageSquare className="size-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={handleCall}
            disabled={isDialing}
            className="h-7 gap-1 rounded-full px-3 text-xs font-semibold"
          >
            <Phone className={`size-3 ${isDialing ? "animate-pulse" : ""}`} />
            Call
          </Button>
        </div>
      </div>
    </article>
  );
}
