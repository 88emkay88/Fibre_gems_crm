import { LeadCard } from "./LeadCard";
import type { Customer } from "./types";
import { PIPELINE_STAGES } from "./pipeline-stages";
import type { KanbanDrag } from "./use-kanban-drag";

interface PipelineBoardProps {
  customers: Customer[];
  drag: KanbanDrag;
  onCallCustomer: (customer: Customer) => void;
  onHangup?: (() => void) | undefined;
  onSelectCustomer?: ((customer: Customer) => void) | undefined;
  activeDialingId?: string | null | undefined;
  callDurationSeconds?: number | undefined;
}

export function PipelineBoard({
  customers,
  drag,
  onCallCustomer,
  onHangup,
  onSelectCustomer,
  activeDialingId,
  callDurationSeconds = 0,
}: PipelineBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
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
                  onHangup={onHangup}
                  onSelect={onSelectCustomer}
                  isDialing={activeDialingId === cust.id}
                  isDragging={drag.draggingId === cust.id}
                  callDurationSeconds={activeDialingId === cust.id ? callDurationSeconds : 0}
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
  );
}
