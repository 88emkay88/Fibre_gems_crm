import { createPortal } from "react-dom";
import { LeadCard } from "./LeadCard";
import { LeadQueue } from "./LeadQueue";
import { PipelineBoard } from "./PipelineBoard";
import type { QueueItem } from "./call-queue";
import { PIPELINE_STAGES } from "./pipeline-stages";
import type { Customer } from "./types";
import { useKanbanDrag } from "./use-kanban-drag";

interface KanbanViewProps {
  queue: QueueItem<Customer>[];
  customers: Customer[];
  today: string;
  activeDialingId?: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onCallCustomer: (customer: Customer) => void;
  onMoveCustomer: (customerId: string, targetStatus: string) => void;
}

export function KanbanView({
  queue,
  customers,
  today,
  activeDialingId,
  onSelectCustomer,
  onCallCustomer,
  onMoveCustomer,
}: KanbanViewProps) {
  const drag = useKanbanDrag({
    onSelect: onSelectCustomer,
    onDrop: (customer, stageId) => {
      const stage = PIPELINE_STAGES.find((s) => s.id === stageId);
      const targetStatus = stage?.statuses[0];
      if (!stage || !targetStatus || stage.statuses.includes(customer.status)) return;
      onMoveCustomer(customer.id, targetStatus);
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <LeadQueue
        items={queue}
        today={today}
        activeDialingId={activeDialingId}
        onCallCustomer={onCallCustomer}
        drag={drag}
      />
      <div className="min-w-0 lg:col-span-3">
        <PipelineBoard
          customers={customers}
          drag={drag}
          onCallCustomer={onCallCustomer}
          activeDialingId={activeDialingId}
        />
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
    </div>
  );
}
