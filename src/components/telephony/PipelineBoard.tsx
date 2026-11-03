import React from "react";
import { LeadCard } from "./LeadCard";
import type { Customer } from "./types";
import { PIPELINE_STAGES, type PipelineStage } from "./pipeline-stages";

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
  const [dragOverStage, setDragOverStage] = React.useState<string | null>(null);

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const customerId = e.dataTransfer.getData("text/plain");
    const targetStatus = stage.statuses[0];
    if (customerId && targetStatus) {
      onMoveCustomer(customerId, targetStatus);
    }
  };

  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageCustomers = customers.filter((c) => stage.statuses.includes(c.status));
        const Icon = stage.icon;
        const isOver = dragOverStage === stage.id;

        return (
          <section
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stage.id);
            }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => handleDrop(e, stage)}
            className={`flex min-w-[220px] flex-1 snap-start flex-col rounded-3xl border p-3 transition-colors duration-200 ${
              isOver ? "border-primary bg-accent/60" : "border-border bg-muted/50"
            }`}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <span className={`h-5 w-1 rounded-full ${stage.accent}`} />
                <Icon className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{stage.title}</h3>
              </div>
              <span className="rounded-full bg-card px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground shadow-sm">
                {stageCustomers.length}
              </span>
            </header>

            <div className="flex max-h-[calc(100vh-360px)] min-h-32 flex-col gap-2.5 overflow-y-auto pr-1">
              {stageCustomers.map((cust) => (
                <LeadCard
                  key={cust.id}
                  customer={cust}
                  onSelect={onSelectCustomer}
                  onCall={onCallCustomer}
                  isDialing={activeDialingId === cust.id}
                />
              ))}

              {stageCustomers.length === 0 && (
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
