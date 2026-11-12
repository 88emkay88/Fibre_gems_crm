import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getTeamCallbacksFn, reassignCallbacksFn } from "@/server/team-lead-functions";

type Tab = "overdue" | "today" | "upcoming";

const TABS: { id: Tab; label: string }[] = [
  { id: "overdue", label: "Overdue" },
  { id: "today", label: "Due today" },
  { id: "upcoming", label: "Upcoming" },
];

const selectClass = "mt-1 h-10 w-full border border-input bg-background px-3 text-sm";

function todayInJohannesburg() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function bucketOf(date: string | null, today: string): Tab {
  const day = (date ?? "").slice(0, 10);
  if (day < today) return "overdue";
  if (day === today) return "today";
  return "upcoming";
}

export function CallbackPoolView() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overdue");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [reassignOpen, setReassignOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState("");
  const today = todayInJohannesburg();

  const query = useQuery({
    queryKey: ["team-callbacks"],
    queryFn: () => getTeamCallbacksFn(),
  });

  const reassign = useMutation({
    mutationFn: (vars: { customerIds: string[]; targetAgentId: string }) =>
      reassignCallbacksFn({ data: vars }),
    onSuccess: (res) => {
      toast.success(`Reassigned ${res.reassigned} callback${res.reassigned === 1 ? "" : "s"}`);
      setSelected(new Set());
      setTargetAgentId("");
      setReassignOpen(false);
      void qc.invalidateQueries({ queryKey: ["team-callbacks"] });
      void qc.invalidateQueries({ queryKey: ["crm-workspace"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Reassignment failed"),
  });

  const callbacks = query.data?.callbacks ?? [];
  const agents = query.data?.agents ?? [];
  const agentName = new Map(agents.map((a) => [a.id, a.full_name]));

  const counts: Record<Tab, number> = { overdue: 0, today: 0, upcoming: 0 };
  for (const c of callbacks) counts[bucketOf(c.next_action_date, today)] += 1;

  const shown = callbacks.filter((c) => bucketOf(c.next_action_date, today) === tab);
  const allShownSelected = shown.length > 0 && shown.every((c) => selected.has(c.id));

  function switchTab(next: Tab) {
    setTab(next);
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllShown() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const c of shown) {
        if (allShownSelected) next.delete(c.id);
        else next.add(c.id);
      }
      return next;
    });
  }

  return (
    <section className="space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Callback pool</h1>
          <p className="text-sm text-muted-foreground">
            Scheduled callbacks across the whole floor. Reassign overdue ones to an available agent.
          </p>
        </div>
        <Link
          to="/agent"
          className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          Agent view
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => switchTab(id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                tab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label} ({counts[id]})
            </button>
          ))}
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button onClick={() => setReassignOpen(true)}>Reassign selected</Button>
          </div>
        )}
      </div>

      {query.isPending && <p className="text-sm text-muted-foreground">Loading callbacks…</p>}

      {query.isError && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load callbacks."}
        </p>
      )}

      {query.isSuccess && shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No callbacks in this list.
        </p>
      )}

      {query.isSuccess && shown.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    aria-label="Select all callbacks in this list"
                    checked={allShownSelected}
                    onChange={toggleAllShown}
                  />
                </th>
                <th className="p-3">Customer</th>
                <th className="p-3">Phone</th>
                <th className="hidden p-3 md:table-cell">Suburb</th>
                <th className="p-3">Assigned agent</th>
                <th className="p-3">Scheduled</th>
                <th className="hidden p-3 lg:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${c.full_name}`}
                      checked={selected.has(c.id)}
                      onChange={() => toggle(c.id)}
                    />
                  </td>
                  <td className="p-3 font-medium text-foreground">{c.full_name}</td>
                  <td className="p-3 text-muted-foreground">{c.cell_number}</td>
                  <td className="hidden p-3 text-muted-foreground md:table-cell">{c.area_suburb ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{agentName.get(c.owner_id) ?? "Unassigned"}</td>
                  <td className="p-3 text-muted-foreground">{c.next_action_date?.slice(0, 10) ?? "—"}</td>
                  <td className="hidden p-3 text-muted-foreground lg:table-cell">{c.next_action ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Reassign {selected.size} callback{selected.size === 1 ? "" : "s"}
            </DialogTitle>
          </DialogHeader>
          <label htmlFor="reassign_agent" className="text-sm font-medium text-foreground">
            Move to agent
          </label>
          <select
            id="reassign_agent"
            className={selectClass}
            value={targetAgentId}
            onChange={(e) => setTargetAgentId(e.target.value)}
          >
            <option value="">Select an agent</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
                {a.agent_code ? ` (${a.agent_code})` : ""}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReassignOpen(false)}
              disabled={reassign.isPending}
            >
              Cancel
            </Button>
            <Button
              disabled={!targetAgentId || reassign.isPending}
              onClick={() =>
                reassign.mutate({ customerIds: [...selected], targetAgentId })
              }
            >
              {reassign.isPending ? "Reassigning…" : "Confirm reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
