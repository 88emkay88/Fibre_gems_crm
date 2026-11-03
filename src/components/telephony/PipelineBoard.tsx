import React from "react";
import { LeadCard } from "./LeadCard";
import type { Customer } from "./types";
import { Sparkles, Phone, CreditCard, CheckCircle2, AlertOctagon } from "lucide-react";

export type ColumnDef = {
  id: string;
  title: string;
  statuses: string[];
  icon: React.ElementType;
  accent: string;
};

export const KANBAN_COLUMNS: ColumnDef[] = [
  {
    id: "new_lead",
    title: "New leads",
    statuses: ["new_lead"],
    icon: Sparkles,
    accent: "bg-primary",
  },
  {
    id: "contacted",
    title: "Initial contact",
    statuses: ["contacted", "qualified"],
    icon: Phone,
    accent: "bg-primary",
  },
  {
    id: "payment_pending",
    title: "Payment promised",
    statuses: ["payment_pending"],
    icon: CreditCard,
    accent: "bg-secondary",
  },
  {
    id: "order_submitted",
    title: "Order completed",
    statuses: ["order_submitted", "activation_pending", "activated"],
    icon: CheckCircle2,
    accent: "bg-success",
  },
  {
    id: "lost",
    title: "Escalated / review",
    statuses: ["lost"],
    icon: AlertOctagon,
    accent: "bg-destructive",
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

  const handleDrop = (e: React.DragEvent, col: ColumnDef) => {
    e.preventDefault();
    setDragOverColumn(null);
    const customerId = e.dataTransfer.getData("text/plain");
    const targetStatus = col.statuses[0];
    if (customerId && targetStatus) {
      onMoveCustomer(customerId, targetStatus);
    }
  };

  return (
    <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
      {KANBAN_COLUMNS.map((col) => {
        const colCustomers = customers.filter((c) => col.statuses.includes(c.status));
        const Icon = col.icon;
        const isOver = dragOverColumn === col.id;

        return (
          <section
            key={col.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.id);
            }}
            onDragLeave={() => setDragOverColumn(null)}
            onDrop={(e) => handleDrop(e, col)}
            className={`flex w-[300px] shrink-0 snap-start flex-col rounded-3xl border p-3 transition-colors duration-200 ${
              isOver ? "border-primary bg-accent/60" : "border-border bg-muted/50"
            }`}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <span className={`h-5 w-1 rounded-full ${col.accent}`} />
                <Icon className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
              </div>
              <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground shadow-sm">
                {colCustomers.length}
              </span>
            </header>

            <div className="flex max-h-[calc(100vh-360px)] min-h-32 flex-col gap-2.5 overflow-y-auto pr-1">
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
                <div className="grid place-items-center rounded-2xl border border-dashed border-border py-10 text-xs text-muted-foreground">
                  Drop leads here
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
