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
            className={`flex min-w-[240px] flex-1 snap-start flex-col rounded-xl border p-3 transition-all duration-200 ${
              isOver ? "border-[#F5B021]/30 bg-[#F5B021]/5" : "border-white/5 bg-[#111111]"
            }`}
          >
            <header className="mb-3 flex items-center justify-between gap-2 px-2 pt-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`size-1.5 shrink-0 rounded-full ${stage.accent}`} />
                <h3 className="truncate text-xs font-bold uppercase tracking-widest text-white/60">
                  {stage.title}
                </h3>
              </div>
              <span className="min-w-6 rounded-full bg-white/5 px-2 py-0.5 text-center text-xs font-bold tabular-nums text-white/50">
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
                <div className="grid place-items-center rounded-xl border border-dashed border-white/5 py-10 text-xs text-white/20">
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
