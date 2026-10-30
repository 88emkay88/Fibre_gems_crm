import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  CloudUpload,
  Gauge,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Signal,
  Sparkles,
  UserRound,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import { getCurrentUserFn, logoutFn, getWorkspaceDataFn, captureLeadFn, logOutcomeFn } from "@/server/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Customer = {
  id: string;
  full_name: string;
  cell_number: string;
  email: string | null;
  area_suburb: string | null;
  product_package: string | null;
  status: string;
  next_action: string | null;
  next_action_date: string | null;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Qualified",
  order_submitted: "Order Placed",
  payment_pending: "Payment Pending",
  activation_pending: "Activation Pending",
  activated: "Activated",
  lost: "Lost Lead",
};

const statusTone: Record<string, string> = {
  new_lead: "border-primary/30 bg-primary/10 text-primary",
  contacted: "border-primary/40 bg-primary/15 text-primary",
  qualified: "border-secondary/40 bg-secondary/15 text-secondary",
  order_submitted: "border-secondary/50 bg-secondary/20 text-secondary",
  payment_pending: "border-destructive/40 bg-destructive/10 text-destructive",
  activation_pending: "border-brand-soft/40 bg-brand-soft/10 text-foreground",
  activated: "border-emerald-500/40 bg-emerald-500/10 text-emerald-500",
  lost: "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
};

export function CrmApp() {
  const queryClient = useQueryClient();
  const [mobileNav, setMobileNav] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      const res = await getCurrentUserFn();
      if (!res?.user) throw new Error("No active session");
      return { user: res.user, profile: res.user, role: res.user.role };
    },
  });

  const workspaceQuery = useQuery({
    queryKey: ["crm-workspace"],
    queryFn: async () => {
      return await getWorkspaceDataFn();
    },
  });

  const customers = (workspaceQuery.data?.customers as Customer[]) ?? [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      const matchesQuery =
        !needle ||
        `${customer.full_name} ${customer.cell_number} ${customer.area_suburb ?? ""}`.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [customers, query, statusFilter]);

  const metrics = useMemo(
    () => ({
      pipeline: customers.length,
      actions: customers.filter(
        (c) => c.next_action_date && c.next_action_date <= new Date().toISOString().slice(0, 10)
      ).length,
      payments: customers.filter((c) => c.status === "payment_pending").length,
      activations: customers.filter((c) => c.status === "activated").length,
    }),
    [customers]
  );

  async function signOut() {
    await logoutFn();
    queryClient.clear();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileNav && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-foreground/20 lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${
          mobileNav ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Wifi className="size-5" />
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-none">FibreGems</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">
                Command centre
              </p>
            </div>
          </div>
          <button
            aria-label="Close menu"
            className="rounded-md p-1.5 text-sidebar-foreground lg:hidden"
            onClick={() => setMobileNav(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4">
          <Button
            onClick={() => setCreateOpen(true)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" /> New Lead
          </Button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-sidebar-muted">Operations</p>
          <button className="flex w-full items-center gap-3 rounded-md bg-sidebar-accent px-3 py-2.5 text-sm font-semibold text-sidebar-accent-foreground">
            <Gauge className="size-4 text-primary" /> Active Pipeline
          </button>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {profileQuery.data?.profile?.fullName?.slice(0, 1) ?? "U"}
              </div>
              <div className="truncate text-xs">
                <p className="font-bold">{profileQuery.data?.profile?.fullName ?? "User"}</p>
                <p className="capitalize text-sidebar-muted">{profileQuery.data?.role ?? "Agent"}</p>
              </div>
            </div>
            <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <main className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-border bg-card/60 px-6 backdrop-blur">
          <div className="flex items-center gap-4">
            <button
              aria-label="Open menu"
              className="rounded-md border border-border p-2 lg:hidden"
              onClick={() => setMobileNav(true)}
            >
              <Menu className="size-5" />
            </button>
            <div>
              <h1 className="font-display text-xl font-bold">Field CRM Dashboard</h1>
              <p className="text-xs text-muted-foreground">PostgreSQL & Drizzle direct integration</p>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-6">
          {notice && (
            <div className="rounded-md border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
              {notice}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Total Pipeline</p>
              <p className="mt-3 text-3xl font-extrabold">{metrics.pipeline}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Due Actions</p>
              <p className="mt-3 text-3xl font-extrabold text-primary">{metrics.actions}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Payment Pending</p>
              <p className="mt-3 text-3xl font-extrabold text-destructive">{metrics.payments}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs font-bold uppercase text-muted-foreground">Activated</p>
              <p className="mt-3 text-3xl font-extrabold text-emerald-500">{metrics.activations}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by customer, cellphone, or suburb"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All statuses</option>
                  {Object.entries(statusLabel).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    {["Customer", "Cellphone", "Suburb", "Package", "Status", "Next action", "Actions"].map((h) => (
                      <th key={h} className="px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                      <td className="px-4 py-3 font-semibold">{c.full_name}</td>
                      <td className="px-4 py-3">{c.cell_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c.area_suburb ?? "—"}</td>
                      <td className="px-4 py-3">{c.product_package ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${statusTone[c.status] ?? ""}`}>
                          {statusLabel[c.status] ?? c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c.next_action ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" onClick={() => setActiveCustomer(c)}>
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        No customers found matching this view.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <CaptureLead
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={(msg) => {
          setNotice(msg);
          void queryClient.invalidateQueries({ queryKey: ["crm-workspace"] });
        }}
      />
      <CustomerDrawer
        customer={activeCustomer}
        onOpenChange={() => setActiveCustomer(null)}
        onSuccess={() => {
          void queryClient.invalidateQueries({ queryKey: ["crm-workspace"] });
        }}
      />
    </div>
  );
}

function CaptureLead({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      await captureLeadFn({
        data: {
          first_name: String(values["first_name"] ?? ""),
          surname: String(values["surname"] ?? ""),
          cell_number: String(values["cell_number"] ?? ""),
          alternate_cell_number: String(values["alternate_cell_number"] || "") || undefined,
          email: String(values["email"] || "") || undefined,
          area_suburb: String(values["area_suburb"] || "") || undefined,
          full_address: String(values["full_address"] || "") || undefined,
          product_package: String(values["product_package"] || "") || undefined,
          payment_type: String(values["payment_type"] || "") || undefined,
          next_action: String(values["next_action"] || "") || undefined,
          next_action_date: String(values["next_action_date"] || "") || undefined,
        },
      });
      setSaving(false);
      onOpenChange(false);
      onSuccess("Lead captured and added to your pipeline.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to capture lead");
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Capture a new lead</DialogTitle>
          <DialogDescription>Customer, package and next-action details are saved to your pipeline.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="first_name" required />
            <Field label="Surname" name="surname" required />
            <Field label="Cell number" name="cell_number" type="tel" required />
            <Field label="Alternate cell" name="alternate_cell_number" type="tel" />
            <Field label="Email" name="email" type="email" />
            <Field label="Area / suburb" name="area_suburb" />
            <div className="sm:col-span-2">
              <Field label="Full address" name="full_address" />
            </div>
            <Field label="Product package" name="product_package" placeholder="Vuma Reach 20Mbps/10Mbps" />
            <Field label="Payment type" name="payment_type" placeholder="Debit order" />
            <Field label="Next action" name="next_action" placeholder="Confirm documents" />
            <Field label="Action date" name="next_action_date" type="date" />
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Capture lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CustomerDrawer({
  customer,
  onOpenChange,
  onSuccess,
}: {
  customer: Customer | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [customer]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) return;
    setSaving(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const status = String(values["status"]);

    try {
      await logOutcomeFn({
        data: {
          customerId: customer.id,
          outcome: "Status update",
          status,
          nextActionDate: String(values["next_action_date"] || "") || null,
          nextAction: String(values["next_action"] || "") || null,
          notes: String(values["notes"] || "") || null,
        },
      });
      setSaving(false);
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update customer");
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(customer)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{customer?.full_name}</DialogTitle>
          <DialogDescription>
            {customer?.cell_number} · {customer?.area_suburb || "Area not set"}
          </DialogDescription>
        </DialogHeader>
        {customer && (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="customer-status">Pipeline status</Label>
              <select
                id="customer-status"
                name="status"
                defaultValue={customer.status}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(statusLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Product package" name="product_package" defaultValue={customer.product_package ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Next action" name="next_action" defaultValue={customer.next_action ?? ""} />
              <Field
                label="Action date"
                name="next_action_date"
                type="date"
                defaultValue={customer.next_action_date ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="notes">Activity note</Label>
              <textarea
                id="notes"
                name="notes"
                className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Add context from the latest contact"
              />
            </div>
            {error && <p className="text-sm font-semibold text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save update"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="mt-1" {...props} />
    </div>
  );
}