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
import { supabase } from "@/integrations/supabase/client";
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

type View = "overview" | "customers" | "activity" | "imports" | "team";
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
  new_lead: "New lead",
  contacted: "Contacted",
  qualified: "Qualified",
  order_submitted: "Order submitted",
  payment_pending: "Payment pending",
  activation_pending: "Activation pending",
  activated: "Activated",
  lost: "Lost",
};

const navItems = [
  { id: "overview" as const, label: "Overview", icon: Gauge },
  { id: "customers" as const, label: "Customers", icon: UsersRound },
  { id: "activity" as const, label: "Activity", icon: Activity },
  { id: "imports" as const, label: "Agility imports", icon: CloudUpload },
  { id: "team" as const, label: "Team", icon: UserRound },
];

function normalizeCell(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("27") ? digits : digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
}

export function CrmApp() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("No active session");
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, agent_code, status").eq("id", auth.user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
      ]);
      return { user: auth.user, profile, role: roles?.[0]?.role ?? "agent" };
    },
  });

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, full_name, cell_number, email, area_suburb, product_package, status, next_action, next_action_date, created_at")
        .eq("record_status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Customer[];
    },
  });

  const customers = customersQuery.data ?? [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
      const matchesQuery = !needle || `${customer.full_name} ${customer.cell_number} ${customer.area_suburb ?? ""}`.toLowerCase().includes(needle);
      return matchesStatus && matchesQuery;
    });
  }, [customers, query, statusFilter]);

  const metrics = useMemo(() => ({
    pipeline: customers.length,
    actions: customers.filter((c) => c.next_action_date && c.next_action_date <= new Date().toISOString().slice(0, 10)).length,
    payments: customers.filter((c) => c.status === "payment_pending").length,
    activations: customers.filter((c) => c.status === "activated").length,
  }), [customers]);

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {mobileNav && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-foreground/20 lg:hidden" onClick={() => setMobileNav(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground"><Wifi className="size-5" /></div>
            <div><p className="font-display text-lg font-bold leading-none">FibreGems</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">Command centre</p></div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileNav(false)}><X /></Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-muted">Workspace</p>
          {navItems.map((item) => <Button key={item.id} variant={view === item.id ? "navActive" : "nav"} className="w-full justify-start" onClick={() => { setView(item.id); setMobileNav(false); }}><item.icon />{item.label}</Button>)}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent font-bold text-sidebar-accent-foreground">{profileQuery.data?.profile?.full_name?.slice(0, 1).toUpperCase() ?? "A"}</div>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{profileQuery.data?.profile?.full_name ?? "CRM user"}</p><p className="truncate text-xs capitalize text-sidebar-muted">{profileQuery.data?.role.replace("_", " ") ?? "agent"}</p></div>
          </div>
          <Button variant="nav" className="w-full justify-start" onClick={signOut}><Settings /> Sign out</Button>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3"><Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileNav(true)}><Menu /></Button><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">FibreGems CRM</p><h1 className="font-display text-xl font-bold capitalize">{view === "imports" ? "Agility imports" : view}</h1></div></div>
          <Button onClick={() => setCaptureOpen(true)}><Plus /> Capture lead</Button>
        </header>

        <div className="mx-auto max-w-[1500px] p-4 md:p-8">
          {notice && <div className="mb-5 flex items-center justify-between border-l-4 border-primary bg-primary-soft px-4 py-3 text-sm font-semibold"><span>{notice}</span><Button variant="ghost" size="icon" onClick={() => setNotice(null)}><X /></Button></div>}
          {view === "overview" && <Overview metrics={metrics} customers={customers.slice(0, 5)} onCustomer={setSelected} onViewAll={() => setView("customers")} />}
          {view === "customers" && <CustomerList customers={filtered} query={query} setQuery={setQuery} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onCustomer={setSelected} />}
          {view === "activity" && <ActivityView customers={customers} />}
          {view === "imports" && <ImportView role={profileQuery.data?.role ?? "agent"} />}
          {view === "team" && <TeamView role={profileQuery.data?.role ?? "agent"} name={profileQuery.data?.profile?.full_name ?? "Agent"} />}
        </div>
      </main>
      <CaptureLead open={captureOpen} onOpenChange={setCaptureOpen} onSuccess={(message) => { setNotice(message); void queryClient.invalidateQueries({ queryKey: ["customers"] }); }} />
      <CustomerDrawer customer={selected} onOpenChange={(open) => !open && setSelected(null)} onSuccess={() => void queryClient.invalidateQueries({ queryKey: ["customers"] })} />
    </div>
  );
}

function Overview({ metrics, customers, onCustomer, onViewAll }: { metrics: Record<string, number>; customers: Customer[]; onCustomer: (customer: Customer) => void; onViewAll: () => void }) {
  const cards = [
    { label: "Active pipeline", value: metrics.pipeline, icon: Signal, detail: "Open customer records" },
    { label: "Actions due", value: metrics.actions, icon: CalendarClock, detail: "Due today or overdue" },
    { label: "Awaiting payment", value: metrics.payments, icon: CircleDollarSign, detail: "Needs follow-up" },
    { label: "Activated", value: metrics.activations, icon: Sparkles, detail: "Completed connections" },
  ];
  return <div className="space-y-8">
    <section className="flex flex-col gap-3 border-b pb-7 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold text-primary">Good work starts with a clear queue.</p><h2 className="mt-1 font-display text-3xl font-bold md:text-4xl">Your sales operation, at a glance.</h2></div><p className="max-w-md text-sm text-muted-foreground">Track every lead from first contact through payment and fibre activation.</p></section>
    <section className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <div key={card.label} className="bg-card p-5"><div className="flex items-start justify-between"><p className="text-sm font-semibold text-muted-foreground">{card.label}</p><card.icon className="size-5 text-primary" /></div><p className="mt-6 font-display text-4xl font-bold">{card.value}</p><p className="mt-2 text-xs text-muted-foreground">{card.detail}</p></div>)}</section>
    <section><div className="mb-4 flex items-center justify-between"><div><h3 className="font-display text-xl font-bold">Recently added</h3><p className="text-sm text-muted-foreground">Newest customers in your permitted pipeline.</p></div><Button variant="outline" onClick={onViewAll}>View all <ChevronRight /></Button></div><CustomerTable customers={customers} onCustomer={onCustomer} /></section>
  </div>;
}

function CustomerList({ customers, query, setQuery, statusFilter, setStatusFilter, onCustomer }: { customers: Customer[]; query: string; setQuery: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onCustomer: (customer: Customer) => void }) {
  return <div className="space-y-5"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div><h2 className="font-display text-3xl font-bold">Customer pipeline</h2><p className="mt-1 text-sm text-muted-foreground">Search, prioritize and progress every assigned customer.</p></div><p className="text-sm font-bold">{customers.length} records</p></div><div className="flex flex-col gap-3 border-y py-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search by name, cell or suburb" /></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"><option value="all">All statuses</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><CustomerTable customers={customers} onCustomer={onCustomer} /></div>;
}

function CustomerTable({ customers, onCustomer }: { customers: Customer[]; onCustomer: (customer: Customer) => void }) {
  if (!customers.length) return <div className="grid min-h-64 place-items-center rounded-lg border border-dashed bg-card text-center"><div><UsersRound className="mx-auto mb-3 size-8 text-primary" /><p className="font-display text-lg font-bold">No customers here yet</p><p className="mt-1 text-sm text-muted-foreground">Capture a lead to start building the pipeline.</p></div></div>;
  return <div className="overflow-hidden rounded-lg border bg-card"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="bg-muted/70 text-[11px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Package</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Next action</th><th className="w-14 px-4 py-3"><span className="sr-only">Open</span></th></tr></thead><tbody className="divide-y">{customers.map((customer) => <tr key={customer.id} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => onCustomer(customer)}><td className="px-4 py-4"><p className="font-semibold">{customer.full_name}</p><p className="text-xs text-muted-foreground">{customer.area_suburb || "Area not set"}</p></td><td className="px-4 py-4 text-sm">{customer.cell_number}</td><td className="px-4 py-4 text-sm">{customer.product_package || "Not selected"}</td><td className="px-4 py-4"><Status status={customer.status} /></td><td className="px-4 py-4"><p className="text-sm font-medium">{customer.next_action || "No action set"}</p><p className="text-xs text-muted-foreground">{customer.next_action_date || "—"}</p></td><td className="px-4 py-4"><MoreHorizontal className="size-4" /></td></tr>)}</tbody></table></div></div>;
}

function Status({ status }: { status: string }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status === "activated" ? "bg-success-soft text-success" : status === "lost" ? "bg-destructive/10 text-destructive" : status.includes("pending") ? "bg-warning-soft text-warning-foreground" : "bg-primary-soft text-primary-strong"}`}>{statusLabel[status] ?? status}</span>; }

function ActivityView({ customers }: { customers: Customer[] }) { return <div><h2 className="font-display text-3xl font-bold">Activity queue</h2><p className="mt-1 text-sm text-muted-foreground">Customers arranged by the next follow-up date.</p><div className="mt-6 space-y-2">{customers.filter((c) => c.next_action).sort((a,b) => (a.next_action_date ?? "9999").localeCompare(b.next_action_date ?? "9999")).map((customer) => <div key={customer.id} className="flex items-center gap-4 rounded-lg border bg-card p-4"><div className="grid size-10 place-items-center rounded-md bg-primary-soft text-primary"><CalendarClock /></div><div className="min-w-0 flex-1"><p className="font-semibold">{customer.next_action}</p><p className="truncate text-sm text-muted-foreground">{customer.full_name} · {customer.cell_number}</p></div><p className="text-sm font-bold">{customer.next_action_date ?? "No date"}</p></div>)}{!customers.some((c) => c.next_action) && <Empty title="No actions queued" text="Next actions appear here when added to a customer." />}</div></div>; }

function ImportView({ role }: { role: string }) { const allowed = role === "admin"; return <div><h2 className="font-display text-3xl font-bold">Agility imports</h2><p className="mt-1 text-sm text-muted-foreground">Stage, validate and reconcile operational reports before they enter the CRM.</p><div className="mt-8 grid max-w-3xl place-items-center rounded-lg border border-dashed bg-card px-6 py-16 text-center"><CloudUpload className="mb-4 size-10 text-primary" /><h3 className="font-display text-xl font-bold">Upload an Agility report</h3><p className="mt-2 max-w-md text-sm text-muted-foreground">CSV and XLSX reports will be checked for duplicate OVR/OVK references and unmapped products before import.</p><Button className="mt-6" disabled={!allowed}>Choose report</Button>{!allowed && <p className="mt-3 text-xs font-semibold text-warning-foreground"><AlertTriangle className="mr-1 inline size-3" />Admin access is required.</p>}</div></div>; }

function TeamView({ role, name }: { role: string; name: string }) { return <div><h2 className="font-display text-3xl font-bold">Team</h2><p className="mt-1 text-sm text-muted-foreground">People, roles and customer access.</p><div className="mt-6 max-w-2xl rounded-lg border bg-card p-5"><div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground font-bold">{name.slice(0,1).toUpperCase()}</div><div className="flex-1"><p className="font-bold">{name}</p><p className="text-sm capitalize text-muted-foreground">{role.replace("_", " ")}</p></div><span className="rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success">Active</span></div></div></div>; }

function Empty({ title, text }: { title: string; text: string }) { return <div className="grid min-h-56 place-items-center rounded-lg border border-dashed bg-card text-center"><div><p className="font-display text-lg font-bold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{text}</p></div></div>; }

function CaptureLead({ open, onOpenChange, onSuccess }: { open: boolean; onOpenChange: (open: boolean) => void; onSuccess: (message: string) => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(null);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Your session expired. Please sign in again."); setSaving(false); return; }
    const cell = String(values["cell_number"] ?? "");
    const { data: existing } = await supabase.from("customers").select("id, full_name, owner_id").eq("normalized_cell", normalizeCell(cell)).maybeSingle();
    if (existing) { setError(existing.owner_id === auth.user.id ? `${existing.full_name} already exists in your pipeline. Open their record to update it.` : "This customer already exists in the company pipeline and belongs to another agent."); setSaving(false); return; }
    const { data: customer, error: insertError } = await supabase.from("customers").insert({ first_name: String(values["first_name"]), surname: String(values["surname"]), cell_number: cell, normalized_cell: normalizeCell(cell), alternate_cell_number: String(values["alternate_cell_number"] || "") || null, email: String(values["email"] || "") || null, full_address: String(values["full_address"] || "") || null, area_suburb: String(values["area_suburb"] || "") || null, product_package: String(values["product_package"] || "") || null, payment_type: String(values["payment_type"] || "") || null, owner_id: auth.user.id, original_agent_id: auth.user.id, created_by: auth.user.id, status: String(values["status"] || "new_lead") as "new_lead", next_action: String(values["next_action"] || "") || null, next_action_date: String(values["next_action_date"] || "") || null }).select("id").single();
    if (insertError || !customer) { setError(insertError?.code === "23505" ? "This cellphone number already exists." : insertError?.message ?? "The customer could not be saved."); setSaving(false); return; }
    await Promise.all([supabase.from("orders").insert({ customer_id: customer.id }), supabase.from("payments").insert({ customer_id: customer.id }), supabase.from("activations").insert({ customer_id: customer.id }), supabase.from("activities").insert({ customer_id: customer.id, actor_id: auth.user.id, action_type: "Lead captured", customer_status_after: "new_lead" })]);
    setSaving(false); onOpenChange(false); onSuccess("Lead captured and added to your pipeline.");
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Capture a new lead</DialogTitle><DialogDescription>Customer, package and next-action details are saved to your pipeline.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="First name" name="first_name" required /><Field label="Surname" name="surname" required /><Field label="Cell number" name="cell_number" type="tel" required /><Field label="Alternate cell" name="alternate_cell_number" type="tel" /><Field label="Email" name="email" type="email" /><Field label="Area / suburb" name="area_suburb" /><div className="sm:col-span-2"><Field label="Full address" name="full_address" /></div><Field label="Product package" name="product_package" placeholder="Vuma Reach 20Mbps/10Mbps" /><Field label="Payment type" name="payment_type" placeholder="Debit order" /><Field label="Next action" name="next_action" placeholder="Confirm documents" /><Field label="Action date" name="next_action_date" type="date" /></div>{error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Capture lead"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function CustomerDrawer({ customer, onOpenChange, onSuccess }: { customer: Customer | null; onOpenChange: (open: boolean) => void; onSuccess: () => void }) {
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => setError(null), [customer]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!customer) return; setSaving(true); const values = Object.fromEntries(new FormData(event.currentTarget)); const { data: auth } = await supabase.auth.getUser(); if (!auth.user) return; const status = String(values["status"]) as "new_lead"; const { error: updateError } = await supabase.from("customers").update({ status, product_package: String(values["product_package"] || "") || null, next_action: String(values["next_action"] || "") || null, next_action_date: String(values["next_action_date"] || "") || null, last_contact_date: new Date().toISOString().slice(0,10) }).eq("id", customer.id); if (updateError) { setError(updateError.message); setSaving(false); return; } await supabase.from("activities").insert({ customer_id: customer.id, actor_id: auth.user.id, action_type: "Customer updated", customer_status_after: status, next_action: String(values["next_action"] || "") || null, next_action_date: String(values["next_action_date"] || "") || null, notes: String(values["notes"] || "") || null }); setSaving(false); onSuccess(); onOpenChange(false); }
  return <Dialog open={Boolean(customer)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-xl"><DialogHeader><DialogTitle>{customer?.full_name}</DialogTitle><DialogDescription>{customer?.cell_number} · {customer?.area_suburb || "Area not set"}</DialogDescription></DialogHeader>{customer && <form onSubmit={submit} className="space-y-4"><div><Label htmlFor="customer-status">Pipeline status</Label><select id="customer-status" name="status" defaultValue={customer.status} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{Object.entries(statusLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div><Field label="Product package" name="product_package" defaultValue={customer.product_package ?? ""} /><div className="grid gap-4 sm:grid-cols-2"><Field label="Next action" name="next_action" defaultValue={customer.next_action ?? ""} /><Field label="Action date" name="next_action_date" type="date" defaultValue={customer.next_action_date ?? ""} /></div><div><Label htmlFor="notes">Activity note</Label><textarea id="notes" name="notes" className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add context from the latest contact" /></div>{error && <p className="text-sm font-semibold text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save update"}</Button></DialogFooter></form>}</DialogContent></Dialog>;
}

function Field({ label, name, ...props }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) { return <div><Label htmlFor={name}>{label}</Label><Input id={name} name={name} className="mt-1" {...props} /></div>; }