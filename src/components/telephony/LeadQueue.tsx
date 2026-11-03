import { Phone, PhoneOff, Clock, Radio, PhoneCall } from "lucide-react";
import type { Customer } from "./types";
import { stageForStatus } from "./pipeline-stages";
import type { QueueItem, Urgency } from "./call-queue";
import { overdueLabel } from "./call-queue";
import type { KanbanDrag } from "./use-kanban-drag";
import { formatCallTime } from "./telephony-service";

interface LeadQueueProps {
  items: QueueItem<Customer>[];
  today: string;
  activeDialingId?: string | null | undefined;
  callDurationSeconds?: number;
  drag: KanbanDrag;
  onCallCustomer: (customer: Customer) => void;
  onHangup?: (() => void) | undefined;
  onSelectCustomer?: ((customer: Customer) => void) | undefined;
}

function formatLastCall(dateStr?: string | null) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00Z` : dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays > 1 && diffDays < 14) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  } catch {
    return dateStr;
  }
}

export function LeadQueue({
  items,
  today,
  activeDialingId,
  callDurationSeconds = 0,
  drag,
  onCallCustomer,
  onHangup,
  onSelectCustomer,
}: LeadQueueProps) {
  return (
    <aside className="flex min-h-0 flex-col rounded-xl border border-white/5 bg-[#111111] p-4 shadow-sm lg:max-h-[calc(100vh-260px)]">
      <header className="mb-3 flex items-center justify-between px-1">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/60">Today&apos;s call stack</h3>
          <p className="text-[11px] text-white/30">Drag card to pipeline stage or click to open</p>
        </div>
        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-bold tabular-nums text-white/50">
          {items.length}
        </span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {items.map(({ customer: c, daysOverdue, urgency }) => {
          const stage = stageForStatus(c.status);
          const Icon = stage.icon;
          const name = c.full_name || `${c.first_name} ${c.surname}`;
          const isDialing = activeDialingId === c.id;
          const isPreviousClient = Boolean(
            c.last_contact_date || (c.status && c.status !== "new_lead")
          );
          const lastCallText = formatLastCall(c.last_contact_date);

          return (
            <article
              key={c.id}
              onClick={() => onSelectCustomer?.(c)}
              onPointerDown={(e) => drag.startDrag(e, c)}
              className={`group flex cursor-grab touch-none select-none items-center gap-3 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 active:cursor-grabbing ${
                isDialing
                  ? "border-[#22C55E] bg-[#22C55E]/10 shadow-[0_0_20px_rgba(34,197,94,0.3)] ring-2 ring-[#22C55E]/50"
                  : isPreviousClient
                  ? "border-[#F5B021]/30 bg-[#161410] hover:border-[#F5B021]/60"
                  : "border-white/5 bg-[#141414] hover:border-white/15"
              } ${drag.draggingId === c.id ? "opacity-40" : ""}`}
            >
              <span
                className={`h-10 w-1 shrink-0 rounded-full ${
                  isDialing
                    ? "bg-[#22C55E] animate-pulse"
                    : isPreviousClient
                    ? "bg-[#F5B021]"
                    : urgency === "critical"
                    ? "bg-destructive"
                    : urgency === "warm"
                    ? "bg-[#F5B021]"
                    : stage.accent
                }`}
              />
              <div className="min-w-0 flex-1">
                {isDialing ? (
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-[#22C55E]">
                    <span className="size-1.5 rounded-full bg-[#22C55E] animate-ping" />
                    <Radio className="size-3 animate-pulse" />
                    LIVE CALL · {formatCallTime(callDurationSeconds)}
                  </div>
                ) : isPreviousClient ? (
                  <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-[#F5B021]">
                    <Clock className="size-2.5" />
                    RETURNING CLIENT
                    {lastCallText && <span className="text-white/40 font-normal">({lastCallText})</span>}
                  </div>
                ) : null}

                <p
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCustomer?.(c);
                  }}
                  title="Click name to view and edit details"
                  className="truncate text-sm font-semibold text-white hover:text-[#F5B021] cursor-pointer hover:underline transition-colors"
                >
                  {name}
                </p>
                <p className={`mt-0.5 flex items-center gap-1 text-xs font-medium text-white/50`}>
                  <Icon className="size-3" />
                  {stage.title}
                </p>
                <p className={`mt-0.5 text-[11px] text-white/30`}>
                  {daysOverdue > 0
                    ? overdueLabel(daysOverdue)
                    : c.next_action_date === today
                      ? "Due today"
                      : "New lead, not yet called"}
                </p>
              </div>
              {isDialing ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onHangup?.();
                  }}
                  aria-label={`Hang up call with ${name}`}
                  title="Hang up active call"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-[#D44B2E] text-white shadow-md shadow-[#D44B2E]/30 transition-transform hover:scale-105 active:scale-95"
                >
                  <PhoneOff className="size-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCallCustomer(c);
                  }}
                  aria-label={`Call ${name}`}
                  title="Call"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#D44B2E] to-[#F5B021] text-black transition-transform hover:scale-105 active:scale-95"
                >
                  <Phone className="size-3.5" />
                </button>
              )}
            </article>
          );
        })}

        {items.length === 0 && (
          <div className="grid flex-1 place-items-center rounded-xl border border-dashed border-white/5 py-12 text-center text-xs text-white/30">
            Nothing due today. New leads and overdue calls will appear here.
          </div>
        )}
      </div>
    </aside>
  );
}
