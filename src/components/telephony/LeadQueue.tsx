import { Phone } from "lucide-react";
import type { Customer } from "./types";
import { stageForStatus } from "./pipeline-stages";
import type { QueueItem, Urgency } from "./call-queue";
import { overdueLabel } from "./call-queue";

interface LeadQueueProps {
  items: QueueItem<Customer>[];
  today: string;
  activeDialingId?: string | null;
  onSelectCustomer: (customer: Customer) => void;
  onCallCustomer: (customer: Customer) => void;
}

const urgencyTint: Record<Urgency, string | null> = {
  none: null,
  warm: "border-primary/50 bg-primary/10",
  critical: "border-destructive/50 bg-destructive/10",
};

const urgencyText: Record<Urgency, string> = {
  none: "text-muted-foreground",
  warm: "font-semibold text-primary",
  critical: "font-semibold text-destructive",
};

export function LeadQueue({
  items,
  today,
  activeDialingId,
  onSelectCustomer,
  onCallCustomer,
}: LeadQueueProps) {
  return (
    <aside className="flex min-h-0 flex-col rounded-3xl border border-border bg-card p-4 shadow-sm lg:max-h-[calc(100vh-260px)]">
      <header className="mb-3 flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Today&apos;s call stack</h3>
          <p className="text-xs text-muted-foreground">Drag a card onto an outcome</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {items.map(({ customer: c, daysOverdue, urgency }) => {
          const stage = stageForStatus(c.status);
          const Icon = stage.icon;
          const name = c.full_name || `${c.first_name} ${c.surname}`;
          const isDialing = activeDialingId === c.id;
          const tint = urgencyTint[urgency] ?? stage.tint;

          return (
            <article
              key={c.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
              onClick={() => onSelectCustomer(c)}
              className={`group flex cursor-grab items-center gap-3 rounded-2xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing ${tint} ${
                isDialing ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <span
                className={`h-10 w-1 shrink-0 rounded-full ${urgency === "critical" ? "bg-destructive" : urgency === "warm" ? "bg-primary" : stage.accent}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{name}</p>
                <p className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${stage.text}`}>
                  <Icon className="size-3" />
                  {stage.title}
                </p>
                <p className={`mt-0.5 text-[11px] ${urgencyText[urgency]}`}>
                  {daysOverdue > 0
                    ? overdueLabel(daysOverdue)
                    : c.next_action_date === today
                      ? "Due today"
                      : "New lead, not yet called"}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onCallCustomer(c);
                }}
                disabled={isDialing}
                aria-label={`Call ${name}`}
                title="Call"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:opacity-50"
              >
                <Phone className="size-4" />
              </button>
            </article>
          );
        })}

        {items.length === 0 && (
          <div className="grid flex-1 place-items-center rounded-2xl border border-dashed border-border py-12 text-center text-xs text-muted-foreground">
            Nothing due today. New leads and overdue calls will appear here.
          </div>
        )}
      </div>
    </aside>
  );
}
