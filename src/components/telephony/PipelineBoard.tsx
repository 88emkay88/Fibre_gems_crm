import { useRef } from "react";
import { createPortal } from "react-dom";
import { LeadCard } from "./LeadCard";
import type { Customer } from "./types";
import { PIPELINE_STAGES } from "./pipeline-stages";
import { useKanbanDrag } from "./use-kanban-drag";

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
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useKanbanDrag({
    boardRef,
    onSelect: onSelectCustomer,
    onDrop: (customerId, stageId) => {
      const stage = PIPELINE_STAGES.find((s) => s.id === stageId);
      const customer = customers.find((c) => c.id === customerId);
      const targetStatus = stage?.statuses[0];
      if (!stage || !targetStatus || !customer || stage.statuses.includes(customer.status)) return;
      onMoveCustomer(customerId, targetStatus);
    },
  });

  return (
    <>
      <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map((stage) => {
          const stageCustomers = customers.filter((c) => stage.statuses.includes(c.status));
          const isOver = drag.overStageId === stage.id;

          return (
            <section
              key={stage.id}
              data-stage-id={stage.id}
              className={`flex min-w-[240px] flex-1 flex-col rounded-xl border p-3 transition-all duration-200 ${
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

              <div
                data-stage-list
                className="flex max-h-[calc(100vh-360px)] min-h-32 flex-col gap-2.5 overflow-y-auto pr-1"
              >
                {stageCustomers.map((cust) => (
                  <LeadCard
                    key={cust.id}
                    customer={cust}
                    onCall={onCallCustomer}
                    isDialing={activeDialingId === cust.id}
                    isDragging={drag.draggingId === cust.id}
                    onPointerDown={(e) => drag.startDrag(e, cust)}
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

      {drag.source &&
        createPortal(
          <div
            ref={drag.overlayRef}
            className="pointer-events-none fixed left-0 top-0 z-50"
            style={{
              width: drag.source.width,
              transform: `translate3d(${drag.source.x - drag.source.offsetX}px, ${drag.source.y - drag.source.offsetY}px, 0)`,
            }}
          >
            <div className="rotate-2 scale-[1.03] shadow-2xl">
              <LeadCard customer={drag.source.customer} onCall={onCallCustomer} />
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
