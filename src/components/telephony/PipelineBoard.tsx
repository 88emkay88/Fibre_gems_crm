import React from "react";
import { LeadCard } from "./LeadCard";
import type { Customer } from "./types";
import { Sparkles, Phone, CreditCard, CheckCircle2, AlertOctagon } from "lucide-react";

export type ColumnDef = {
  id: string;
  title: string;
  statuses: string[];
  icon: React.ElementType;
  color: string;
  headerBorder: string;
};

export const KANBAN_COLUMNS: ColumnDef[] = [
  {
    id: "new_lead",
    title: "New Leads",
    statuses: ["new_lead"],
    icon: Sparkles,
    color: "text-blue-400 bg-blue-500/10",
    headerBorder: "border-blue-500/30",
  },
  {
    id: "contacted",
    title: "Initial Contact",
    statuses: ["contacted", "qualified"],
    icon: Phone,
    color: "text-purple-400 bg-purple-500/10",
    headerBorder: "border-purple-500/30",
  },
  {
    id: "payment_pending",
    title: "Payment Promised",
    statuses: ["payment_pending"],
    icon: CreditCard,
    color: "text-amber-400 bg-amber-500/10",
    headerBorder: "border-amber-500/30",
  },
  {
    id: "order_submitted",
    title: "Order Completed",
    statuses: ["order_submitted", "activation_pending", "activated"],
    icon: CheckCircle2,
    color: "text-emerald-400 bg-emerald-500/10",
    headerBorder: "border-emerald-500/30",
  },
  {
    id: "lost",
    title: "Escalated / Review",
    statuses: ["lost"],
    icon: AlertOctagon,
    color: "text-rose-400 bg-rose-500/10",
    headerBorder: "border-rose-500/30",
  },
];

interface PipelineBoardProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onCallCustomer: (customer: Customer) => void;
  onMoveCustomer: (customerId: string, targetStatus: string) => void;
  activeDialingId?: string | null;
}

export function PipelineBoard({
  customers,
  onSelectCustomer,
  onCallCustomer,
  onMoveCustomer,
  activeDialingId,
}: PipelineBoardProps) {
  const [dragOverColumn, setDragOverColumn] = React.useState<string | null>(null);

  const getColumnCustomers = (col: ColumnDef) => {
    return customers.filter((c) => col.statuses.includes(c.status));
  };

  const handleDrop = (e: React.DragEvent, col: ColumnDef) => {
    e.preventDefault();
    setDragOverColumn(null);
    const customerId = e.dataTransfer.getData("text/plain");
    if (customerId) {
      onMoveCustomer(customerId, col.statuses[0]);
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 select-none">
      {KANBAN_COLUMNS.map((col) => {
        const colCustomers = getColumnCustomers(col);
        const Icon = col.icon;
        const isOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.id);
            }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, col)}
            className={`flex flex-col w-[310px] shrink-0 rounded-2xl border bg-slate-950/60 p-3 transition-colors ${
              isOver ? "border-primary/60 bg-slate-900/40" : "border-slate-800/80"
            }`}
          >
            {/* Column Header */}
            <div className={`flex items-center justify-between border-b pb-3 mb-3 ${col.headerBorder}`}>
              <div className="flex items-center gap-2">
                <div className={`grid size-7 place-items-center rounded-lg ${col.color}`}>
                  <Icon className="size-4" />
                </div>
                <h3 className="font-semibold text-sm text-slate-200">{col.title}</h3>
              </div>
              <span className="grid size-6 place-items-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                {colCustomers.length}
              </span>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-270px)] pr-1">
              {colCustomers.map((cust) => (
                <LeadCard
                  key={cust.id}
                  customer={cust}
                  onSelect={onSelectCustomer}
                  onCall={onCallCustomer}
                  isDialing={activeDialingId === cust.id}
                />
              ))}

              {colCustomers.length === 0 && (
                <div className="grid place-items-center rounded-xl border border-dashed border-slate-800/60 py-12 text-xs text-slate-500">
                  Drop leads here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

