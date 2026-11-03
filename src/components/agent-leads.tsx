import { useState } from "react";
import type { Customer } from "./telephony/types";

type Tab = "uploaded" | "self";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "uploaded", label: "Uploaded to me", hint: "Leads added to your account by the company" },
  { id: "self", label: "Self-sourced", hint: "Leads you captured yourself" },
];

interface AgentLeadsViewProps {
  customers: Customer[];
  currentUserId: string;
  onOpenDetails: (customer: Customer) => void;
}

export function AgentLeadsView({ customers, currentUserId, onOpenDetails }: AgentLeadsViewProps) {
  const [tab, setTab] = useState<Tab>("uploaded");

  const uploaded = customers.filter((c) => c.created_by !== currentUserId);
  const selfSourced = customers.filter((c) => c.created_by === currentUserId);
  const shown = tab === "uploaded" ? uploaded : selfSourced;
  const activeHint = TABS.find((t) => t.id === tab)?.hint;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My leads</h2>
          <p className="text-sm text-muted-foreground">{activeHint}</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
          {TABS.map(({ id, label }) => {
            const count = id === "uploaded" ? uploaded.length : selfSourced.length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No leads here yet.
        </p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {shown.map((c) => {
            const name = c.full_name || `${c.first_name} ${c.surname}`;
            return (
              <div
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
                className="cursor-pointer rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{name}</p>
                    <p className="text-sm text-muted-foreground">{c.cell_number}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    Added {c.created_at.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {c.product_package || "Package not set"}
                  {c.area_suburb ? ` · ${c.area_suburb}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
