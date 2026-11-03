import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock3,
  Copy,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCurrentUserFn,
  logoutFn,
  getWorkspaceDataFn,
  captureLeadFn,
  logOutcomeFn,
} from "@/server/functions";
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
import { AgilitySync } from "@/components/agility-sync";
import { TopMetricsBar } from "./telephony/TopMetricsBar";
import { PipelineBoard } from "./telephony/PipelineBoard";
import { LeadQueue } from "./telephony/LeadQueue";
import { buildCallQueue } from "./telephony/call-queue";
import { CallbackQueueView } from "./agent-callbacks";
import { CustomerDrawer } from "./telephony/CustomerDrawer";
import { SoftphoneBar } from "./telephony/SoftphoneBar";
import { dialCustomerApi, updateStageApi } from "./telephony/telephony-service";
import type { AgentTelephonyState } from "./telephony/types";

type Customer = {
  id: string;
  full_name: string;
  first_name: string;
  surname: string;
  cell_number: string;
  area_suburb: string | null;
  product_package: string | null;
  payment_type: string | null;
  status: string;
  owner_id: string;
  next_action: string | null;
  next_action_date: string | null;
  last_contact_date: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  customer_id: string;
  actor_id: string;
  action_type: string;
  outcome: string | null;
  notes: string | null;
  customer_status_after: string | null;
  next_action: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  email: string;
  agent_code: string | null;
  status: string;
};

type WorkspaceMode = "agent" | "admin";

const statusNames: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  qualified: "Interested",
  order_submitted: "Order Placed",
  payment_pending: "Payment Pending",
  activation_pending: "Activation Pending",
  activated: "Activated",
  lost: "Not Interested",
};

const packages = [
  "Vuma Reach 10Mbps/10Mbps",
  "Vuma Reach 20Mbps/10Mbps",
  "Vuma Reach 50Mbps/25Mbps",
  "Vuma Reach 100Mbps/50Mbps",
];

const jhbDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const dateAdd = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const dateText = (date?: string | null) =>
  date
    ? new Intl.DateTimeFormat("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${date.slice(0, 10)}T12:00:00Z`))
    : "—";

const norm = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `27${digits.slice(1)}` : digits;
};

const tone = (status: string) =>
  status === "activated"
    ? "text-success bg-success/10"
    : status === "lost"
      ? "text-destructive bg-destructive/10"
      : status.includes("pending")
        ? "text-secondary bg-secondary/10"
        : "text-primary bg-primary/10";

function Badge({ text, status }: { text: string; status?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2.5 py-1 text-xs font-semibold ${tone(status ?? "new_lead")}`}
    >
      {text}
    </span>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </Label>
      <Input id={name} name={name} {...props} />
    </div>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <div className="border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
      {title}
    </div>
  );
}

export function CrmWorkspace({ mode }: { mode: WorkspaceMode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState(mode === "admin" ? "dashboard" : "kanban");
  const [menu, setMenu] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [leadOpen, setLeadOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCustomer, setDrawerCustomer] = useState<Customer | null>(null);
  const [telephonyState, setTelephonyState] = useState<AgentTelephonyState>({
    agentStatus: "ready",
    pauseCode: null,
    activeCustomerId: null,
    activeCustomerName: null,
    activeCustomerPhone: null,
    callDurationSeconds: 0,
    isMuted: false,
    isOnHold: false,
  });

  const handleCall = async (customer: Customer) => {
    setDrawerCustomer(customer);
    const name = customer.full_name || `${customer.first_name} ${customer.surname}`;
    const dialed = await dialCustomerApi(customer.id, customer.cell_number, name);
    if (!dialed) return;
    setTelephonyState((prev) => ({
      ...prev,
      agentStatus: "in_call",
      pauseCode: null,
      activeCustomerId: customer.id,
      activeCustomerName: name,
      activeCustomerPhone: customer.cell_number,
      callDurationSeconds: 0,
      isMuted: false,
      isOnHold: false,
    }));
  };

  const handleMoveCustomer = async (customerId: string, targetStatus: string) => {
    qc.setQueryData(["crm-workspace", mode], (old: any) => {
      if (!old?.customers) return old;
      return {
        ...old,
        customers: old.customers.map((c: any) =>
          c.id === customerId ? { ...c, status: targetStatus } : c,
        ),
      };
    });
    await updateStageApi(customerId, targetStatus);
    refresh();
  };

  const me = useQuery({
    queryKey: ["crm-me"],
    queryFn: async () => {
      const res = await getCurrentUserFn();
      if (!res?.user) throw Error("Sign in required");
      return res.user;
    },
  });

  const workspaceQ = useQuery({
    queryKey: ["crm-workspace", mode],
    queryFn: async () => {
      return await getWorkspaceDataFn({ data: { mode } });
    },
  });

  const customers: Customer[] = (workspaceQ.data?.customers as Customer[]) ?? [];
  const activities: ActivityRow[] = (workspaceQ.data?.activities as ActivityRow[]) ?? [];
  const profiles: Profile[] = (workspaceQ.data?.profiles as Profile[]) ?? [];
  const today = jhbDate();
  const name = me.data?.fullName ?? "FibreGems user";

  const queue = useMemo(() => buildCallQueue(customers, today), [customers, today]);

  const completed = useMemo(
    () =>
      new Set(
        activities
          .filter(
            (a) =>
              a.actor_id === me.data?.id &&
              a.created_at &&
              new Intl.DateTimeFormat("en-CA", {
                timeZone: "Africa/Johannesburg",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              }).format(new Date(a.created_at)) === today,
          )
          .map((a) => a.customer_id),
      ),
    [activities, me.data?.id, today],
  );

  const queueRemaining = queue.filter((item) => !completed.has(item.customer.id)).length;
  const queueScheduled = queueRemaining + completed.size;

  const openNextQueued = (savedCustomerId: string) => {
    refresh();
    const next = queue.find((item) => item.customer.id !== savedCustomerId);
    if (!next) return;
    setDrawerCustomer(next.customer);
    setDrawerOpen(true);
  };

  const navigation =
    mode === "agent"
      ? [
          { id: "kanban", label: "Pipeline Command (REMI)", icon: LayoutGrid },
          { id: "callbacks", label: "Today's Call Backs", icon: Phone },
          { id: "worklist", label: "All Assigned Leads", icon: ClipboardList },
          { id: "newlead", label: "New Lead Capture", icon: Plus },
          { id: "activity", label: "My Activity Log", icon: Activity },
        ]
      : [
          { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
          { id: "callbacks", label: "Call Back Reports", icon: Phone },
          { id: "grid", label: "Master Grid", icon: ClipboardList },
          { id: "sync", label: "Agility Sync", icon: RefreshCw },
          { id: "agents", label: "Manage Agents", icon: Users },
        ];

  const heading =
    mode === "admin"
      ? (
          {
            dashboard: "Command Centre",
            callbacks: "Call Back Accountability",
            grid: "Master Lead & Order Grid",
            sync: "Agility Sync",
            agents: "Manage Agents",
          } as Record<string, string>
        )[view]
      : view === "kanban"
        ? "Pipeline"
        : "Daily Execution Command";

  async function logout() {
    await logoutFn();
    qc.clear();
    await navigate({ to: "/" });
  }

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["crm-workspace"] });
    void qc.invalidateQueries({ queryKey: ["crm-me"] });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {menu && (
        <Button
          variant="ghost"
          aria-label="Close menu"
          className="fixed inset-0 z-30 h-full w-full rounded-none bg-background/70 lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar/95 backdrop-blur-xl transition-transform lg:translate-x-0 ${
          menu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded bg-primary text-primary-foreground">
              <Shield className="size-5" />
            </div>
            <div>
              <div className="font-bold text-white">FibreGems</div>
              <div className="text-[10px] uppercase text-primary">
                {mode === "admin" ? "Command Centre" : "Agent Daily Workspace"}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenu(false)}>
            <X />
          </Button>
        </div>
        <div className="border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{name}</div>
              <div className="text-xs text-muted-foreground">
                {mode === "admin" ? "System Administrator" : "Sales Agent"}
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 py-3 text-xs font-semibold uppercase text-muted-foreground">
            Workspace
          </p>
          {navigation.map((item) => (
            <Button
              key={item.id}
              variant={view === item.id ? "navActive" : "nav"}
              className="h-11 w-full justify-start"
              onClick={() => {
                setView(item.id);
                setMenu(false);
              }}
            >
              {<item.icon />}
              <span className="flex-1 text-left">{item.label}</span>
              {item.id === "callbacks" && queueRemaining > 0 && (
                <span className="rounded bg-destructive/15 px-1.5 text-xs text-destructive">
                  {queueRemaining}
                </span>
              )}
            </Button>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button variant="nav" className="w-full justify-start text-destructive" onClick={logout}>
            <LogOut /> Log out
          </Button>
        </div>
      </aside>
      <main className="min-h-screen lg:ml-64 pb-24">
        <header className="flex min-h-20 items-center justify-between gap-3 border-b border-border px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open menu"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </Button>
            <div>
              <p className="text-[11px] font-semibold uppercase text-primary">
                {mode === "admin" ? "FibreGems / Administration" : `FibreGems / ${dateText(today)}`}
              </p>
              <h1 className="text-xl font-bold md:text-2xl">{heading}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              title="Refresh"
              aria-label="Refresh"
              onClick={refresh}
            >
              <RefreshCw />
            </Button>
            {mode === "agent" && (
              <Button onClick={() => setLeadOpen(true)}>
                <Plus />
                <span className="hidden sm:inline">Quick lead</span>
              </Button>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-[1600px] space-y-7 p-4 md:p-8">
          {workspaceQ.isError ? (
            <div className="border border-destructive p-4 text-destructive">
              Unable to load CRM data.{" "}
              <Button variant="link" onClick={refresh}>
                Retry
              </Button>
            </div>
          ) : null}

          {mode === "agent" && view === "kanban" && (
            <div className="space-y-6">
              <TopMetricsBar
                scheduledToday={queueScheduled}
                completedToday={completed.size}
                remainingCalls={queueRemaining}
                totalTouches={
                  activities.filter(
                    (a) => a.actor_id === me.data?.id && a.created_at?.slice(0, 10) === today,
                  ).length
                }
                completionRate={
                  queueScheduled > 0 ? Math.round((completed.size / queueScheduled) * 100) : 0
                }
                onRefresh={refresh}
                onQuickLead={() => setLeadOpen(true)}
                isRefreshing={workspaceQ.isFetching}
              />

              <div className="grid gap-4 lg:grid-cols-4">
                <LeadQueue
                  items={queue}
                  today={today}
                  activeDialingId={telephonyState.activeCustomerId}
                  onSelectCustomer={(c) => {
                    setDrawerCustomer(c as any);
                    setDrawerOpen(true);
                  }}
                  onCallCustomer={handleCall}
                />
                <div className="min-w-0 lg:col-span-3">
                  <PipelineBoard
                    customers={customers as any}
                    onSelectCustomer={(c) => {
                      setDrawerCustomer(c as any);
                      setDrawerOpen(true);
                    }}
                    onCallCustomer={handleCall}
                    onMoveCustomer={handleMoveCustomer}
                    activeDialingId={telephonyState.activeCustomerId}
                  />
                </div>
              </div>
            </div>
          )}

          {mode === "agent" && view !== "kanban" && (
            <AgentStats
              scheduled={queueScheduled}
              done={completed.size}
              remaining={queueRemaining}
              touches={
                activities.filter(
                  (a) => a.actor_id === me.data?.id && a.created_at?.slice(0, 10) === today,
                ).length
              }
            />
          )}
          {mode === "agent" && view === "callbacks" && (
            <CallbackQueueView items={queue} today={today} onSelect={setSelected} />
          )}
          {mode === "agent" && view === "worklist" && (
            <Worklist customers={customers} onSelect={setSelected} />
          )}
          {mode === "agent" && view === "newlead" && (
            <LeadForm
              onDone={() => {
                refresh();
                setView("callbacks");
              }}
              onExisting={(c) => {
                setLeadOpen(false);
                setSelected(c);
              }}
              customers={customers}
            />
          )}
          {mode === "agent" && view === "activity" && (
            <ActivityLog
              activities={activities.filter((a) => a.actor_id === me.data?.id)}
              customers={customers}
            />
          )}
          {mode === "admin" && view === "dashboard" && (
            <AdminDashboard
              customers={customers}
              activities={activities}
              profiles={profiles}
              today={today}
              onReports={() => setView("callbacks")}
            />
          )}
          {mode === "admin" && view === "callbacks" && (
            <Accountability
              customers={customers}
              activities={activities}
              profiles={profiles}
              onSelect={setSelected}
            />
          )}
          {mode === "admin" && view === "grid" && (
            <Worklist customers={customers} onSelect={setSelected} admin />
          )}
          {mode === "admin" && view === "sync" && <AgilitySync />}
          {mode === "admin" && view === "agents" && <Agents profiles={profiles} />}
        </div>
      </main>
      <OutcomeDialog
        customer={selected}
        today={today}
        onClose={() => setSelected(null)}
        onSaved={openNextQueued}
      />
      {leadOpen && (
        <Dialog open onOpenChange={setLeadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New lead</DialogTitle>
            </DialogHeader>
            <LeadForm
              customers={customers}
              onDone={() => {
                setLeadOpen(false);
                refresh();
              }}
              onExisting={setSelected}
            />
          </DialogContent>
        </Dialog>
      )}
      {mode === "agent" && (
        <>
          <SoftphoneBar
            telephonyState={telephonyState}
            setTelephonyState={setTelephonyState}
            onDispositionComplete={openNextQueued}
          />
          <CustomerDrawer
            customer={drawerCustomer as any}
            activities={activities as any}
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onCall={handleCall}
            onRefreshData={refresh}
          />
        </>
      )}
    </div>
  );
}

function AgentStats({
  scheduled,
  done,
  remaining,
  touches,
}: {
  scheduled: number;
  done: number;
  remaining: number;
  touches: number;
}) {
  return (
    <section>
      <div className="mb-5">
        <h2 className="text-lg font-semibold">Today’s execution</h2>
        <p className="text-sm text-muted-foreground">
          Your assigned leads and scheduled follow-ups.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Scheduled Today", scheduled, CalendarDays],
          ["Completed Today", done, Check],
          ["Remaining Calls", remaining, Clock3],
          ["Total Touches Logged", touches, Activity],
        ].map(([label, value, Icon]) => {
          const IconComponent = Icon as typeof CalendarDays;
          return (
            <div
              key={String(label)}
              className="border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{label as string}</span>
                <IconComponent className="size-4 text-primary" />
              </div>
              <div className="mt-5 text-3xl font-bold">{value as number}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-4 text-xs text-muted-foreground">
        <span>Call completion</span>
        <div className="h-1.5 flex-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${scheduled ? (done / scheduled) * 100 : 0}%` }}
          />
        </div>
        <span>{scheduled ? Math.round((done / scheduled) * 100) : 0}%</span>
      </div>
    </section>
  );
}

function Worklist({
  customers,
  onSelect,
  admin = false,
}: {
  customers: Customer[];
  onSelect: (c: Customer) => void;
  admin?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const rows = customers.filter((c) =>
    `${c.full_name} ${c.cell_number} ${c.area_suburb ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const size = admin ? 50 : 20;
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const current = Math.min(page, pages - 1);
  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{admin ? "All customers" : "All Assigned Leads"}</h2>
          <p className="text-sm text-muted-foreground">{rows.length} active records</p>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search customers"
            placeholder="Search name, phone or area"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            className="pl-9"
          />
        </div>
      </div>
      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              {["Customer", "Phone", "Package", "Status", "Scheduled callback", "Action"].map(
                (h) => (
                  <th key={h} className="px-4 py-3">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.slice(current * size, (current + 1) * size).map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-4 py-4 font-semibold">
                  {c.full_name}
                  <span className="block font-normal text-muted-foreground">{c.area_suburb}</span>
                </td>
                <td className="px-4 py-4">{c.cell_number}</td>
                <td className="px-4 py-4">{c.product_package ?? "—"}</td>
                <td className="px-4 py-4">
                  <Badge text={statusNames[c.status] ?? c.status} status={c.status} />
                </td>
                <td className="px-4 py-4">{dateText(c.next_action_date)}</td>
                <td className="px-4 py-4">
                  <Button variant="outline" size="sm" onClick={() => onSelect(c)}>
                    Open <ArrowRight />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty title="No matching customers" />}
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {current + 1} of {pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={current >= pages - 1}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </section>
  );
}

function ActivityLog({
  activities,
  customers,
}: {
  activities: ActivityRow[];
  customers: Customer[];
}) {
  const [query, setQuery] = useState("");
  const names = new Map(customers.map((c) => [c.id, c.full_name]));
  const shown = activities.filter((a) =>
    `${names.get(a.customer_id) ?? ""} ${a.outcome ?? a.action_type} ${a.notes ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">My Activity Log</h2>
          <p className="text-sm text-muted-foreground">Your recent customer interactions</p>
        </div>
        <Input
          aria-label="Search activity"
          placeholder="Search activity"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
      </div>
      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              {["When", "Customer", "Outcome", "Status after", "Notes"].map((x) => (
                <th className="px-4 py-3" key={x}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.slice(0, 100).map((a) => (
              <tr className="border-t border-border" key={a.id}>
                <td className="px-4 py-4">
                  {new Date(a.created_at).toLocaleString("en-ZA", {
                    timeZone: "Africa/Johannesburg",
                  })}
                </td>
                <td className="px-4 py-4 font-semibold">
                  {names.get(a.customer_id) ?? "Customer"}
                </td>
                <td className="px-4 py-4">{a.outcome ?? a.action_type}</td>
                <td className="px-4 py-4">{statusNames[a.customer_status_after ?? ""] ?? "—"}</td>
                <td className="max-w-xs truncate px-4 py-4 text-muted-foreground">
                  {a.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!shown.length && <Empty title="No activity logged yet" />}
      </div>
    </section>
  );
}

function LeadForm({
  customers,
  onDone,
  onExisting,
}: {
  customers: Customer[];
  onDone: () => void;
  onExisting: (customer: Customer) => void;
}) {
  const [busy, setBusy] = useState(false);
  const today = jhbDate();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const v = new FormData(e.currentTarget);
    const cell = String(v.get("cell_number") ?? "");
    const existing = customers.find((c) => norm(c.cell_number) === norm(cell));
    if (existing) {
      setBusy(false);
      toast.warning("Duplicate detected — open the existing record instead.");
      onExisting(existing);
      return;
    }

    try {
      await captureLeadFn({
        data: {
          first_name: String(v.get("first_name") ?? ""),
          surname: String(v.get("surname") ?? ""),
          cell_number: cell,
          alternate_cell_number: String(v.get("alternate_cell_number") || "") || undefined,
          email: String(v.get("email") || "") || undefined,
          area_suburb: String(v.get("area_suburb") || "") || undefined,
          full_address: String(v.get("full_address") || "") || undefined,
          product_package: String(v.get("product_package") || "") || undefined,
          payment_type: String(v.get("payment_type") || "") || undefined,
          next_action: String(v.get("next_action") || "") || undefined,
          next_action_date: String(v.get("next_action_date") || "") || undefined,
        },
      });
      toast.success("Lead captured successfully");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to capture lead");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      <h2 className="text-xl font-bold">New Lead Capture</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="first_name" required />
        <Field label="Surname" name="surname" required />
        <Field label="Cell number" name="cell_number" required type="tel" />
        <Field label="Email" name="email" type="email" />
        <Field label="Area / Suburb" name="area_suburb" />
        <Field label="Full address" name="full_address" />
        <div>
          <Label htmlFor="product_package">Product package</Label>
          <select
            id="product_package"
            name="product_package"
            className="mt-1 h-10 w-full border border-input bg-background px-3 text-sm"
          >
            <option value="">Select package</option>
            {packages.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="payment_type">Payment type</Label>
          <select
            id="payment_type"
            name="payment_type"
            className="mt-1 h-10 w-full border border-input bg-background px-3 text-sm"
          >
            <option value="">Select payment type</option>
            <option>Prepaid</option>
            <option>Debit Order</option>
            <option>EasyPay</option>
          </select>
        </div>
        <Field label="Next action" name="next_action" />
        <Field
          label="Action date"
          name="next_action_date"
          type="date"
          min={today}
          max={dateAdd(today, 8)}
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Capture lead"}
      </Button>
    </form>
  );
}

function OutcomeDialog({
  customer,
  today,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  today: string;
  onClose: () => void;
  onSaved: (customerId: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!customer) return;
    setBusy(true);
    const v = new FormData(e.currentTarget);
    const outcome = String(v.get("outcome"));
    const needsDate = outcome !== "Activated" && outcome !== "Not Interested";
    if (needsDate && !v.get("next_action_date")) {
      toast.error("Pick a next action date");
      setBusy(false);
      return;
    }
    const status =
      (
        {
          "Sale Won": "payment_pending",
          Activated: "activated",
          "Not Interested": "lost",
          "Payment Received": "activation_pending",
        } as Record<string, string>
      )[outcome] ?? customer.status;

    const nextDate =
      outcome === "Activated"
        ? dateAdd(today, 7)
        : needsDate
          ? String(v.get("next_action_date"))
          : null;

    try {
      await logOutcomeFn({
        data: {
          customerId: customer.id,
          outcome,
          status,
          nextActionDate: nextDate,
          nextAction:
            outcome === "Activated"
              ? "After-Sales Call"
              : outcome === "Not Interested"
                ? "No Further Action"
                : "Customer Callback",
          notes: String(v.get("notes") || "") || null,
        },
      });
      toast.success("Outcome saved");
      onSaved(customer.id);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save outcome");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={Boolean(customer)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Call Outcome</DialogTitle>
          <DialogDescription>
            {customer?.full_name} · {customer?.cell_number}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="outcome">Outcome</Label>
            <select
              id="outcome"
              name="outcome"
              className="mt-1 h-10 w-full border border-input bg-background px-3"
            >
              <option>No Answer</option>
              <option>Reschedule Call</option>
              <option>Sale Won</option>
              <option>Activated</option>
              <option>Payment Received</option>
              <option>Not Interested</option>
            </select>
          </div>
          <Field label="Next callback date" name="next_action_date" type="date" min={today} />
          <div>
            <Label htmlFor="outcome_notes">Notes</Label>
            <textarea
              id="outcome_notes"
              name="notes"
              className="mt-1 min-h-24 w-full border border-input bg-background p-3"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save outcome"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminDashboard({
  customers,
  activities,
  profiles,
  today,
  onReports,
}: {
  customers: Customer[];
  activities: ActivityRow[];
  profiles: Profile[];
  today: string;
  onReports: () => void;
}) {
  const todays = activities.filter((a) => a.created_at.slice(0, 10) === today);
  const active = new Set(todays.map((a) => a.actor_id)).size;
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Pipeline health and field execution</p>
        <Button onClick={onReports}>
          <Phone /> View Call Back Performance
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Active Agents", active],
          ["Total Pipeline Leads", customers.length],
          ["Today's Total Touches", todays.length],
        ].map(([label, value]) => (
          <div key={label} className="border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-5 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-bold">Agent Live Activity</h2>
          {profiles.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-border py-3 text-sm">
              <span>{p.full_name}</span>
              <span>{todays.filter((a) => a.actor_id === p.id).length} touches</span>
            </div>
          ))}
          {!profiles.length && <Empty title="No agents found" />}
        </div>
        <div>
          <h2 className="mb-3 font-bold">Pipeline Status Breakdown</h2>
          {Object.entries(statusNames).map(([key, label]) => {
            const count = customers.filter((c) => c.status === key).length;
            return (
              <div key={key} className="mb-3 text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{label}</span>
                  <span>{count}</span>
                </div>
                <div className="h-1 bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${customers.length ? (count / customers.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Accountability({
  customers,
  activities,
  profiles,
  onSelect,
}: {
  customers: Customer[];
  activities: ActivityRow[];
  profiles: Profile[];
  onSelect: (c: Customer) => void;
}) {
  const [day, setDay] = useState(jhbDate());
  const scheduled = customers.filter((c) => c.next_action_date === day);
  const done = (c: Customer) =>
    activities.some(
      (a) =>
        a.customer_id === c.id && a.actor_id === c.owner_id && a.created_at.slice(0, 10) === day,
    );
  const missed = scheduled.filter((c) => day < jhbDate() && !done(c));
  return (
    <section>
      <div className="mb-5 flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setDay(jhbDate())}>
          Today
        </Button>
        <Button variant="outline" onClick={() => setDay(dateAdd(jhbDate(), -1))}>
          Yesterday
        </Button>
        <Input
          aria-label="Report date"
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className="w-auto"
        />
      </div>
      {missed.length > 0 && (
        <div className="mb-4 border border-destructive p-4 text-destructive">
          <AlertTriangle className="mr-2 inline size-4" />
          {missed.length} missed call backs detected
        </div>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          ["Scheduled", scheduled.length],
          ["Completed", scheduled.filter(done).length],
          ["Missed", missed.length],
        ].map(([label, num]) => (
          <div key={label} className="border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-4 text-3xl font-bold">{num}</p>
          </div>
        ))}
      </div>
      <h2 className="mb-3 text-lg font-bold">Agent Execution Breakdown</h2>
      <div className="overflow-x-auto border border-border">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr>
              {["Agent", "Scheduled", "Completed", "Missed", "Completion Rate"].map((x) => (
                <th key={x} className="p-3">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const list = scheduled.filter((c) => c.owner_id === p.id);
              const count = list.filter(done).length;
              return (
                <tr className="border-t border-border" key={p.id}>
                  <td className="p-3">{p.full_name}</td>
                  <td className="p-3">{list.length}</td>
                  <td className="p-3">{count}</td>
                  <td className="p-3">{day < jhbDate() ? list.length - count : 0}</td>
                  <td className="p-3">
                    {list.length ? Math.round((count / list.length) * 100) : 0}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2 className="mb-3 mt-7 text-lg font-bold">Missed Call Backs</h2>
      {missed.map((c) => (
        <div key={c.id} className="flex items-center justify-between border-b border-border py-3">
          <div>
            <p className="font-semibold">{c.full_name}</p>
            <p className="text-xs text-muted-foreground">{c.cell_number}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onSelect(c)}>
            Open
          </Button>
        </div>
      ))}
      {!missed.length && <Empty title="No missed call backs for this date" />}
    </section>
  );
}

function Agents({ profiles }: { profiles: Profile[] }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">Manage Agents</h2>
      <div className="overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead>
            <tr>
              {["Agent", "Email", "Status"].map((x) => (
                <th key={x} className="p-4">
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-4 font-semibold">{p.full_name}</td>
                <td className="p-4">{p.email}</td>
                <td className="p-4">
                  <Badge text={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!profiles.length && <Empty title="No agents found" />}
      </div>
    </section>
  );
}
