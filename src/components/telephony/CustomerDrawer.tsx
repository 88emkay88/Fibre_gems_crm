import { useState, type ElementType, type ReactNode } from "react";
import {
  PhoneCall,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  User,
  Package,
  ClipboardList,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Customer, ActivityRow } from "./types";
import {
  reissueEasyPayApi,
  escalateLeadApi,
  submitDispositionApi,
  jhbDateOffset,
  ESCALATION_LEVELS,
} from "./telephony-service";

interface CustomerDrawerProps {
  customer: Customer | null;
  activities: ActivityRow[];
  isOpen: boolean;
  onClose: () => void;
  onCall: (customer: Customer) => void;
  onRefreshData: () => void;
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-1 truncate text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: ElementType;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-card p-5 shadow-sm ring-1 ring-black/5">
      <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="size-4 text-primary" />
        {title}
      </h4>
      {children}
    </section>
  );
}

export function CustomerDrawer({
  customer,
  activities,
  isOpen,
  onClose,
  onCall,
  onRefreshData,
}: CustomerDrawerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [quickNote, setQuickNote] = useState("");
  const [dispoOutcome, setDispoOutcome] = useState("CALLBACK");
  const [dispoDate, setDispoDate] = useState(() => jhbDateOffset(1));
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateLevel, setEscalateLevel] = useState(ESCALATION_LEVELS[0] ?? "");
  const [escalateReason, setEscalateReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!customer) return null;

  const customerActivities = activities.filter((a) => a.customer_id === customer.id);
  const name = customer.full_name || `${customer.first_name} ${customer.surname}`;

  const handleReissueEP = async () => {
    setIsSubmitting(true);
    await reissueEasyPayApi(customer.id);
    setIsSubmitting(false);
    onRefreshData();
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim()) return;
    setIsSubmitting(true);
    await escalateLeadApi(customer.id, escalateLevel, escalateReason);
    setEscalateOpen(false);
    setEscalateReason("");
    setIsSubmitting(false);
    onRefreshData();
  };

  const handleLogNote = async () => {
    if (!quickNote.trim()) return;
    const needsDate = dispoOutcome !== "NI" && dispoOutcome !== "DNC";
    if (needsDate && !dispoDate) return;
    setIsSubmitting(true);
    await submitDispositionApi({
      customerId: customer.id,
      disposition: dispoOutcome,
      notes: quickNote,
      callbackDate: needsDate ? dispoDate : null,
    });
    setQuickNote("");
    setIsSubmitting(false);
    onRefreshData();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 border-l border-border bg-background p-0 sm:max-w-xl"
      >
        <SheetHeader className="space-y-4 border-b border-border/70 bg-card/90 p-6 text-left backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="truncate text-2xl font-semibold tracking-tight text-foreground">
                {name}
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                {customer.area_suburb || "Area not set"} · Added {customer.created_at.slice(0, 10)}
              </SheetDescription>
            </div>
            <Button
              size="sm"
              onClick={() => onCall(customer)}
              className="shrink-0 gap-1.5 rounded-full px-4 shadow-sm"
            >
              <PhoneCall />
              Call
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 rounded-full bg-muted p-1">
              <TabsTrigger value="overview" className="rounded-full text-xs">
                Overview
              </TabsTrigger>
              <TabsTrigger value="financial" className="rounded-full text-xs">
                Orders & EasyPay
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-full text-xs">
                Timeline ({customerActivities.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <>
              <Panel title="Contact" icon={User}>
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Primary cell" value={customer.cell_number} mono />
                  <Detail label="Alternate phone" value={customer.alternate_cell_number} mono />
                  <div className="col-span-2">
                    <Detail label="Email" value={customer.email || "No email on record"} />
                  </div>
                  <div className="col-span-2">
                    <Detail label="Street address" value={customer.full_address} />
                  </div>
                </dl>
              </Panel>
              <Panel title="Package" icon={Package}>
                <dl className="grid grid-cols-2 gap-4">
                  <Detail label="Product" value={customer.product_package || "Not selected"} />
                  <Detail label="Payment type" value={customer.payment_type || "Prepaid"} />
                  <Detail label="Next action" value={customer.next_action || "None scheduled"} />
                  <Detail label="Area" value={customer.area_suburb} />
                </dl>
              </Panel>
            </>
          )}

          {activeTab === "financial" && (
            <>
              <Panel title="EasyPay" icon={CreditCard}>
                <dl className="mb-5 grid grid-cols-2 gap-4">
                  <Detail
                    label="EasyPay number"
                    value={customer.easypay_number || "Not assigned"}
                    mono
                  />
                  <Detail label="Cycle" value={customer.easypay_cycle} />
                  <Detail label="Expiry date" value={customer.easypay_expiry_date} mono />
                  <Detail
                    label="Order reference"
                    value={customer.order_number || "Awaiting submission"}
                    mono
                  />
                </dl>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReissueEP}
                  disabled={isSubmitting}
                  className="rounded-full"
                >
                  <RefreshCw />
                  Re-issue EasyPay (+14 days)
                </Button>
              </Panel>
            </>
          )}

          {activeTab === "history" && (
            <section className="space-y-3">
              {customerActivities.map((act) => (
                <div
                  key={act.id}
                  className="rounded-2xl bg-card p-4 text-sm shadow-sm ring-1 ring-black/5"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{act.action_type}</span>
                    <span>{new Date(act.created_at).toLocaleString()}</span>
                  </div>
                  {act.outcome && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{act.outcome}</Badge>
                      {act.customer_status_after && (
                        <span className="text-xs text-muted-foreground">
                          to {act.customer_status_after.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  )}
                  {act.notes && <p className="mt-2 text-muted-foreground">{act.notes}</p>}
                  {act.recording_url && (
                    <audio controls className="mt-3 h-8 w-full" src={act.recording_url} />
                  )}
                </div>
              ))}
              {customerActivities.length === 0 && (
                <div className="grid place-items-center rounded-2xl border border-dashed border-border py-12 text-sm text-muted-foreground">
                  No activity recorded yet
                </div>
              )}
            </section>
          )}
        </div>

        <div className="space-y-3 border-t border-border/70 bg-card/90 p-5 backdrop-blur-xl">
          <div className="flex gap-2">
            <select
              value={dispoOutcome}
              onChange={(e) => setDispoOutcome(e.target.value)}
              aria-label="Outcome"
              className="h-10 rounded-full border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="CALLBACK">Callback</option>
              <option value="PAYMENT_PROMISED">Payment promised</option>
              <option value="SALE">Sale won</option>
              <option value="NI">Not interested</option>
              <option value="DNC">Do not call</option>
            </select>
            {dispoOutcome !== "NI" && dispoOutcome !== "DNC" && (
              <input
                type="date"
                value={dispoDate}
                min={jhbDateOffset(0)}
                onChange={(e) => setDispoDate(e.target.value)}
                aria-label="Next action date"
                className="h-10 rounded-full border border-input bg-background px-3 text-sm text-foreground"
              />
            )}
            <Input
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Add a note"
              className="h-10 rounded-full bg-background px-4"
            />
            <Button
              onClick={handleLogNote}
              disabled={isSubmitting || !quickNote.trim()}
              className="h-10 rounded-full px-4"
            >
              Log
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEscalateOpen((open) => !open)}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <AlertTriangle />
              Raise escalation
            </Button>
          </div>

          {escalateOpen && (
            <div className="space-y-2.5 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <select
                value={escalateLevel}
                onChange={(e) => setEscalateLevel(e.target.value)}
                aria-label="Escalation level"
                className="h-9 w-full rounded-full border border-input bg-card px-3 text-sm text-foreground"
              >
                {ESCALATION_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
              <Input
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Reason for escalation"
                className="h-9 rounded-full bg-card px-4"
              />
              <Button
                variant="destructive"
                size="sm"
                onClick={handleEscalate}
                disabled={isSubmitting || !escalateReason.trim()}
                className="w-full rounded-full"
              >
                <ClipboardList />
                Confirm escalation
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
