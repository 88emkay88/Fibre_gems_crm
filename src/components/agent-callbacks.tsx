import { useState } from "react";
import { Copy, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Customer } from "./telephony/types";
import { overdueLabel, type QueueItem, type Urgency } from "./telephony/call-queue";
import { stageForStatus } from "./telephony/pipeline-stages";

type Filter = "all" | "overdue" | "today" | "new";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Due today" },
  { id: "new", label: "New leads" },
];

const cardTone: Record<Urgency, string> = {
  none: "border-border",
  warm: "border-primary/60 bg-primary/5",
  critical: "border-destructive/60 bg-destructive/5",
};

const labelTone: Record<Urgency, string> = {
  none: "bg-muted text-muted-foreground",
  warm: "bg-primary/15 text-primary",
  critical: "bg-destructive/15 text-destructive",
};

function matchesFilter(item: QueueItem<Customer>, filter: Filter, today: string) {
  switch (filter) {
    case "overdue":
      return item.daysOverdue > 0;
    case "today":
      return item.customer.next_action_date === today;
    case "new":
      return item.isNewLead;
    default:
      return true;
  }
}

interface CallbackQueueViewProps {
  items: QueueItem<Customer>[];
  today: string;
  onSelect: (customer: Customer) => void;
  onOpenDetails: (customer: Customer) => void;
}

export function CallbackQueueView({
  items,
  today,
  onSelect,
  onOpenDetails,
}: CallbackQueueViewProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = items.filter((item) => matchesFilter(item, filter, today));

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Today&apos;s call backs</h2>
          <p className="text-sm text-muted-foreground">Overdue calls and new leads come first</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
          {FILTERS.map(({ id, label }) => {
            const count = items.filter((item) => matchesFilter(item, id, today)).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  filter === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {shown.map(({ customer: c, daysOverdue, urgency, isNewLead }) => {
          const stage = stageForStatus(c.status);
          const name = c.full_name || `${c.first_name} ${c.surname}`;
          const label =
            daysOverdue > 0 ? overdueLabel(daysOverdue) : isNewLead ? "New lead" : "Due today";
          return (
            <article
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDetails(c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onOpenDetails(c);
                }
              }}
              aria-label={`View details for ${name}`}
              className={`cursor-pointer rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${cardTone[urgency]}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-foreground">{name}</h3>
                  <p className="font-mono text-sm text-muted-foreground">{c.cell_number}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${labelTone[urgency]}`}
                >
                  {label}
                </span>
              </div>
              <p className={`mt-3 text-xs font-medium ${stage.text}`}>{stage.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.product_package ?? "Package not set"}
              </p>
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    void navigator.clipboard
                      .writeText(c.cell_number)
                      .then(() => toast.success("Number copied"));
                  }}
                >
                  <Copy />
                  Copy number
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(c);
                  }}
                >
                  <Phone />
                  Log outcome
                </Button>
              </div>
            </article>
          );
        })}
        {shown.length === 0 && (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border py-16 text-sm text-muted-foreground xl:col-span-2">
            No call backs in this view
          </div>
        )}
      </div>
    </section>
  );
}
