import { useState, useEffect, type ElementType, type ReactNode } from "react";
import {
  PhoneCall,
  PhoneOff,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  User,
  Package,
  ClipboardList,
  Copy,
  CheckCircle2,
  Save,
  FileText,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Customer, ActivityRow } from "./types";
import { PRODUCT_PACKAGES } from "./types";
import { OUTCOMES, outcomeFor, stageForCustomer } from "./pipeline-stages";
import {
  reissueEasyPayApi,
  escalateLeadApi,
  submitDispositionApi,
  updateCustomerDetailsApi,
  jhbDateOffset,
  ESCALATION_LEVELS,
} from "./telephony-service";
import { useQueryClient } from "@tanstack/react-query";

const PAYMENT_TYPES = ["Prepaid", "Debit Order", "EasyPay"] as const;

interface CustomerDrawerProps {
  customer: Customer | null;
  activities: ActivityRow[];
  isOpen: boolean;
  onClose: () => void;
  onCall: (customer: Customer) => void;
  onHangup?: () => void;
  isCallActive?: boolean;
  onRefreshData: () => void;
  onCaptureReferral?: (customer: Customer) => void;
  onOutcomeLogged?: (customerId: string) => void;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <dt className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
      {children}
    </dt>
  );
}

function FieldValue({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return (
    <dd className={`mt-0.5 text-sm font-medium text-white ${mono ? "font-mono" : ""}`}>
      {children || <span className="text-white/30">—</span>}
    </dd>
  );
}

function ReadonlyField({
  label,
  value,
  mono = false,
  allowCopy = true,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  allowCopy?: boolean;
}) {
  const copy = async () => {
    if (!value || value === "—") return;
    const ok = await copyToClipboard(value);
    if (ok) {
      toast.success(`${label} copied`, { description: value });
    }
  };
  const hasValue = Boolean(value && value !== "—" && value !== "None scheduled");

  return (
    <div>
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        {allowCopy && hasValue && (
          <button
            type="button"
            onClick={copy}
            title={`Copy ${label}`}
            className="flex items-center gap-1 text-[10px] text-white/40 transition hover:text-[#F5B021]"
          >
            <Copy className="size-2.5" />
            <span>Copy</span>
          </button>
        )}
      </div>
      <FieldValue mono={mono}>{value}</FieldValue>
    </div>
  );
}

function EditField({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly,
  mono = false,
  allowCopy = true,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  mono?: boolean;
  allowCopy?: boolean;
}) {
  const handleCopy = async () => {
    if (!value) return;
    const ok = await copyToClipboard(value);
    if (ok) {
      toast.success(`${label} copied`, { description: value });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
          {label}
        </Label>
        {allowCopy && Boolean(value.trim()) && (
          <button
            type="button"
            onClick={handleCopy}
            title={`Copy ${label}`}
            className="flex items-center gap-1 text-[10px] text-white/40 transition hover:text-[#F5B021]"
          >
            <Copy className="size-2.5" />
            <span>Copy</span>
          </button>
        )}
      </div>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        readOnly={readOnly}
        className={`mt-1 h-9 border-white/10 bg-white/5 text-sm text-white placeholder:text-white/20 focus:border-[#F5B021]/50 read-only:text-white/40 ${
          mono ? "font-mono" : ""
        }`}
      />
    </div>
  );
}

function EditSelect({
  label,
  id,
  value,
  onChange,
  options,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-[#F5B021]/50 focus:outline-none"
      >
        <option value="" className="bg-[#1a1a1a]">— select —</option>
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#1a1a1a]">
            {o}
          </option>
        ))}
      </select>
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
    <section className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
        <Icon className="size-3.5 text-[#F5B021]" />
        {title}
      </h4>
      {children}
    </section>
  );
}

function customerSummary(customer: Customer) {
  const name = customer.full_name || `${customer.first_name || ""} ${customer.surname || ""}`.trim();
  return [
    `Name: ${name || "-"}`,
    `Primary cell: ${customer.cell_number || "-"}`,
    `Alternate phone: ${customer.alternate_cell_number || "-"}`,
    `Email: ${customer.email || "-"}`,
    `Street address: ${customer.full_address || "-"}`,
    `Area: ${customer.area_suburb || "-"}`,
    `Product: ${customer.product_package || "-"}`,
    `Payment type: ${customer.payment_type || "Prepaid"}`,
    `EasyPay number: ${customer.easypay_number || "-"}`,
    `EasyPay cycle: Cycle ${customer.easypay_cycle || "1"}`,
    `EasyPay expiry: ${customer.easypay_expiry_date || customer.easypay_expiry || "-"}`,
    `OVR number: ${customer.ovr_number || "-"}`,
    `OVK number: ${customer.ovk_number || "-"}`,
    `Referral code: ${customer.referral_code || "-"}`,
    `Next action: ${customer.next_action || "None scheduled"}`,
  ].join("\n");
}

export function CustomerDrawer({
  customer,
  activities,
  isOpen,
  onClose,
  onCall,
  onHangup,
  isCallActive = false,
  onRefreshData,
  onCaptureReferral,
  onOutcomeLogged,
}: CustomerDrawerProps) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("contact");

  // Contact/Package edit form
  const [form, setForm] = useState({
    first_name: "",
    surname: "",
    alternate_cell_number: "",
    email: "",
    full_address: "",
    area_suburb: "",
    product_package: "",
    payment_type: "",
    easypay_number: "",
    easypay_cycle: "1",
    easypay_expiry_date: "",
    ovr_number: "",
    ovk_number: "",
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [detailsDirty, setDetailsDirty] = useState(false);

  // Outcome tab
  const [dispoOutcome, setDispoOutcome] = useState("CALLBACK");
  const [dispoDate, setDispoDate] = useState(() => jhbDateOffset(1));
  const [quickNote, setQuickNote] = useState("");

  // Escalation
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateLevel, setEscalateLevel] = useState(ESCALATION_LEVELS[0] ?? "");
  const [escalateReason, setEscalateReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when customer changes
  useEffect(() => {
    if (!customer) return;
    setForm({
      first_name: customer.first_name ?? "",
      surname: customer.surname ?? "",
      alternate_cell_number: customer.alternate_cell_number ?? "",
      email: customer.email ?? "",
      full_address: customer.full_address ?? "",
      area_suburb: customer.area_suburb ?? "",
      product_package: customer.product_package ?? "",
      payment_type: customer.payment_type ?? "",
      easypay_number: customer.easypay_number ?? "",
      easypay_cycle: customer.easypay_cycle != null ? String(customer.easypay_cycle) : "1",
      easypay_expiry_date: customer.easypay_expiry_date ?? customer.easypay_expiry ?? "",
      ovr_number: customer.ovr_number ?? "",
      ovk_number: customer.ovk_number ?? "",
    });
    setDetailsDirty(false);
    setActiveTab("contact");
  }, [customer?.id]);

  if (!customer) return null;

  const customerActivities = activities.filter((a) => a.customer_id === customer.id);
  const name = customer.full_name || `${customer.first_name || ""} ${customer.surname || ""}`.trim();
  const stage = stageForCustomer(customer);

  function updateField(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setDetailsDirty(true);
  }

  const handleSaveDetails = async () => {
    setIsSavingDetails(true);
    try {
      await updateCustomerDetailsApi(customer.id, {
        first_name: form.first_name,
        surname: form.surname,
        alternate_cell_number: form.alternate_cell_number.trim() || null,
        email: form.email.trim() || null,
        full_address: form.full_address.trim() || null,
        area_suburb: form.area_suburb.trim() || null,
        product_package: form.product_package || null,
        payment_type: form.payment_type || null,
        easypay_number: form.easypay_number.trim() || null,
        easypay_cycle: form.easypay_cycle.trim() || "1",
        easypay_expiry_date: form.easypay_expiry_date.trim() || null,
        ovr_number: form.ovr_number.trim() || null,
        ovk_number: form.ovk_number.trim() || null,
      });
      void qc.invalidateQueries({ queryKey: ["crm-workspace"] });
      setDetailsDirty(false);
      onRefreshData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save details");
    } finally {
      setIsSavingDetails(false);
    }
  };

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

  const handleLogOutcome = async () => {
    const needsDate = outcomeFor(dispoOutcome)?.dateRequired ?? false;
    if (needsDate && !dispoDate) {
      toast.error("Pick a next action date");
      return;
    }
    setIsSubmitting(true);
    await submitDispositionApi({
      customerId: customer.id,
      disposition: dispoOutcome,
      currentStatus: customer.status,
      notes: quickNote.trim() || `Outcome logged: ${outcomeFor(dispoOutcome)?.label ?? dispoOutcome}`,
      callbackDate: needsDate ? dispoDate : null,
    });
    setQuickNote("");
    setIsSubmitting(false);
    onRefreshData();
    onOutcomeLogged?.(customer.id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <SheetContent
        side="right"
        hideOverlay
        onInteractOutside={(e) => e.preventDefault()}
        className="flex h-full w-full flex-col gap-0 border-l border-white/10 bg-[#0d0d0d] p-0 sm:max-w-xl pointer-events-auto shadow-2xl"
      >
        {/* Header */}
        <SheetHeader className="border-b border-white/8 bg-[#141414] px-5 py-4 text-left">
          {/* Title and details with right padding so it never touches the top-right close 'X' */}
          <div className="pr-12">
            <SheetTitle className="truncate text-xl font-bold text-white">{name}</SheetTitle>
            <SheetDescription className="mt-0.5 text-xs text-white/50">
              {customer.area_suburb || "Area not set"} · Added {customer.created_at.slice(0, 10)}
            </SheetDescription>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${stage.tint} ${stage.text}`}>
                {stage.title}
              </span>
            </div>
          </div>

          {/* Action buttons positioned lower down, clearly separated from the close button */}
          <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5">
            {isCallActive ? (
              <button
                type="button"
                onClick={() => onHangup?.()}
                title="Currently on active call with this customer. Click to hang up."
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[#D44B2E] px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#D44B2E]/90 active:scale-95 cursor-pointer animate-pulse"
              >
                <span className="size-2 rounded-full bg-white animate-ping" />
                <PhoneOff className="size-3.5" />
                <span>On Call</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCall(customer)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[#22C55E] px-3.5 text-xs font-bold text-black shadow-sm transition hover:bg-[#22C55E]/90 active:scale-95 cursor-pointer"
              >
                <PhoneCall className="size-3.5" /> Call Customer
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                const text = customerSummary(customer);
                const ok = await copyToClipboard(text);
                if (ok) {
                  toast.success("Customer details copied to clipboard", {
                    description: `${name} · ${customer.cell_number}`,
                  });
                } else {
                  toast.error("Could not copy details to clipboard");
                }
              }}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white active:scale-95 cursor-pointer"
            >
              <Copy className="size-3.5 text-[#F5B021]" /> Copy Details
            </button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
            <TabsList className="grid w-full grid-cols-4 rounded-xl bg-white/5 p-1 h-auto">
              <TabsTrigger value="contact" className="rounded-lg py-1.5 text-[11px] font-semibold data-[state=active]:bg-[#F5B021] data-[state=active]:text-black data-[state=active]:shadow-none text-white/60">
                Contact
              </TabsTrigger>
              <TabsTrigger value="package" className="rounded-lg py-1.5 text-[11px] font-semibold data-[state=active]:bg-[#F5B021] data-[state=active]:text-black data-[state=active]:shadow-none text-white/60">
                Package
              </TabsTrigger>
              <TabsTrigger value="outcome" className="rounded-lg py-1.5 text-[11px] font-semibold data-[state=active]:bg-[#F5B021] data-[state=active]:text-black data-[state=active]:shadow-none text-white/60">
                Outcome
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg py-1.5 text-[11px] font-semibold data-[state=active]:bg-[#F5B021] data-[state=active]:text-black data-[state=active]:shadow-none text-white/60">
                Timeline ({customerActivities.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* ── CONTACT TAB ── */}
          {activeTab === "contact" && (
            <>
              {/* Referral Programme Section (Especially prominent when activated) */}
              {(customer.status === "activated" || customer.referral_code) && (
                <section className="rounded-2xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#22C55E]">
                      <Sparkles className="size-4 animate-pulse" />
                      {customer.status === "activated" ? "Activated · Referral Programme" : "Referral Programme"}
                    </span>
                    <span className="rounded border border-[#22C55E]/40 bg-black/60 px-2 py-0.5 text-[11px] font-mono font-semibold text-white">
                      {customer.referral_code || "REF-READY"}
                    </span>
                  </div>
                  {customer.status === "activated" && (
                    <p className="text-xs text-white/80 leading-relaxed italic">
                      "Now that your high-speed fibre is active, who in your family, friends or neighbourhood would also be interested in getting connected?"
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (customer.referral_code) {
                          void copyToClipboard(customer.referral_code);
                          toast.success("Referral code copied!", { description: customer.referral_code });
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black/80 transition"
                    >
                      <Copy className="size-3.5 text-[#F5B021]" />
                      Copy Code: {customer.referral_code || "N/A"}
                    </button>
                    {onCaptureReferral && (
                      <button
                        type="button"
                        onClick={() => onCaptureReferral(customer)}
                        className="flex items-center gap-1.5 rounded-lg bg-[#22C55E] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#22C55E]/90 transition active:scale-95 ml-auto"
                      >
                        <UserPlus className="size-3.5" />
                        + Capture Referral Lead
                      </button>
                    )}
                  </div>
                </section>
              )}

              <Panel title="Contact Details" icon={User}>
                <div className="grid grid-cols-2 gap-3">
                  <EditField label="First Name" id="cd_first" value={form.first_name} onChange={(v) => updateField("first_name", v)} />
                  <EditField label="Surname" id="cd_surname" value={form.surname} onChange={(v) => updateField("surname", v)} />
                  <div className="col-span-2">
                    <ReadonlyField label="Primary Cell" value={customer.cell_number} mono />
                  </div>
                  <div className="col-span-2">
                    <ReadonlyField label="Customer Referral Code" value={customer.referral_code || "Pending activation"} mono />
                  </div>
                  <div className="col-span-2">
                    <EditField label="Alternate Number" id="cd_alt" value={form.alternate_cell_number} onChange={(v) => updateField("alternate_cell_number", v)} placeholder="Optional" type="tel" />
                  </div>
                  <div className="col-span-2">
                    <EditField label="Email" id="cd_email" value={form.email} onChange={(v) => updateField("email", v)} placeholder="email@example.com" type="email" />
                  </div>
                  <div className="col-span-2">
                    <EditField label="Street Address" id="cd_addr" value={form.full_address} onChange={(v) => updateField("full_address", v)} placeholder="Street address" />
                  </div>
                  <div className="col-span-2">
                    <EditField label="Area / Suburb" id="cd_area" value={form.area_suburb} onChange={(v) => updateField("area_suburb", v)} placeholder="Area or suburb" />
                  </div>
                </div>
              </Panel>
              {detailsDirty && (
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5B021] py-2.5 text-sm font-bold text-black transition hover:bg-[#F5B021]/90 disabled:opacity-60 cursor-pointer"
                >
                  <Save className="size-4" />
                  {isSavingDetails ? "Saving…" : "Save Contact Changes"}
                </button>
              )}
            </>
          )}

          {/* ── PACKAGE TAB ── */}
          {activeTab === "package" && (
            <>
              <Panel title="Product & Payment" icon={Package}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <EditSelect
                      label="Product Package"
                      id="pkg_product"
                      value={form.product_package}
                      onChange={(v) => updateField("product_package", v)}
                      options={PRODUCT_PACKAGES as unknown as readonly string[]}
                    />
                  </div>
                  <div className="col-span-2">
                    <EditSelect
                      label="Payment Type"
                      id="pkg_payment"
                      value={form.payment_type}
                      onChange={(v) => updateField("payment_type", v)}
                      options={PAYMENT_TYPES}
                    />
                  </div>
                </div>
              </Panel>

              <Panel title="EasyPay" icon={CreditCard}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <EditField label="EasyPay Number" id="ep_num" value={form.easypay_number} onChange={(v) => updateField("easypay_number", v)} placeholder="EasyPay number" mono />
                  </div>
                  <div className="col-span-1">
                    <Label htmlFor="ep_cycle" className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                      EasyPay Cycle
                    </Label>
                    <select
                      id="ep_cycle"
                      value={form.easypay_cycle || "1"}
                      onChange={(e) => updateField("easypay_cycle", e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-[#F5B021]/50 focus:outline-none"
                    >
                      <option value="1" className="bg-[#1a1a1a]">Cycle 1 (Initial Cycle)</option>
                      <option value="2" className="bg-[#1a1a1a]">Cycle 2</option>
                      <option value="3" className="bg-[#1a1a1a]">Cycle 3</option>
                    </select>
                  </div>
                  <div className="col-span-1">
                    <ReadonlyField
                      label="Expiry Date"
                      value={form.easypay_expiry_date || customer.easypay_expiry_date || customer.easypay_expiry || "Calculated (+14 days)"}
                    />
                  </div>
                  <div className="col-span-2">
                    <ReadonlyField label="Order Reference" value={customer.order_number || "Awaiting submission"} mono />
                  </div>
                  <div className="col-span-1">
                    <EditField label="OVR Number" id="ep_ovr" value={form.ovr_number} onChange={(v) => updateField("ovr_number", v)} placeholder="e.g. OVR123456" mono />
                  </div>
                  <div className="col-span-1">
                    <EditField label="OVK Number" id="ep_ovk" value={form.ovk_number} onChange={(v) => updateField("ovk_number", v)} placeholder="e.g. OVK123456" mono />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleReissueEP}
                  disabled={isSubmitting}
                  className="mt-4 flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/10 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className="size-3.5" />
                  Re-issue EasyPay (+14 days)
                </button>
              </Panel>

              <Panel title="Schedule" icon={ClipboardList}>
                <dl className="grid grid-cols-2 gap-3">
                  <ReadonlyField label="Next Action" value={customer.next_action || "None scheduled"} />
                  <ReadonlyField label="Action Date" value={customer.next_action_date || "—"} />
                  <ReadonlyField label="Last Contact" value={customer.last_contact_date || "—"} />
                </dl>
              </Panel>

              {detailsDirty && (
                <button
                  type="button"
                  onClick={handleSaveDetails}
                  disabled={isSavingDetails}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5B021] py-2.5 text-sm font-bold text-black transition hover:bg-[#F5B021]/90 disabled:opacity-60 cursor-pointer"
                >
                  <Save className="size-4" />
                  {isSavingDetails ? "Saving…" : "Save Package Changes"}
                </button>
              )}
            </>
          )}

          {/* ── OUTCOME TAB ── */}
          {activeTab === "outcome" && (
            <>
              <Panel title="Log Outcome" icon={FileText}>
                <div className="space-y-3">
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Outcome</Label>
                    <select
                      value={dispoOutcome}
                      onChange={(e) => setDispoOutcome(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white focus:border-[#F5B021]/50 focus:outline-none"
                    >
                      {OUTCOMES.map((o) => (
                        <option key={o.code} value={o.code} className="bg-[#1a1a1a]">
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!!(outcomeFor(dispoOutcome)?.dateRequired) && (
                    <div>
                      <Label className="text-[11px] font-semibold uppercase tracking-wide text-white/50">
                        {dispoOutcome === "PAYMENT_PROMISED" || dispoOutcome === "SALE"
                          ? "Payment Promised By"
                          : "Next Action Date"}
                      </Label>
                      <Input
                        type="date"
                        value={dispoDate}
                        min={jhbDateOffset(0)}
                        onChange={(e) => setDispoDate(e.target.value)}
                        className="mt-1 h-9 border-white/10 bg-white/5 text-sm text-white"
                      />
                    </div>
                  )}
                  <div>
                    <Label className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Notes (Optional)</Label>
                    <textarea
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="Optional call notes…"
                      className="mt-1 min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/20 focus:border-[#F5B021]/50 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLogOutcome}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5B021] py-2.5 text-sm font-bold text-black transition hover:bg-[#F5B021]/90 disabled:opacity-50 cursor-pointer"
                  >
                    <CheckCircle2 className="size-4" />
                    {isSubmitting ? "Saving…" : "Log Outcome"}
                  </button>
                </div>
              </Panel>

              <Panel title="Escalation" icon={AlertTriangle}>
                {!escalateOpen ? (
                  <button
                    type="button"
                    onClick={() => setEscalateOpen(true)}
                    className="flex items-center gap-2 text-xs font-semibold text-[#D44B2E] hover:text-[#D44B2E]/80 transition cursor-pointer"
                  >
                    <AlertTriangle className="size-4" /> Raise escalation
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <select
                      value={escalateLevel}
                      onChange={(e) => setEscalateLevel(e.target.value)}
                      className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white"
                    >
                      {ESCALATION_LEVELS.map((level) => (
                        <option key={level} value={level} className="bg-[#1a1a1a]">
                          {level}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={escalateReason}
                      onChange={(e) => setEscalateReason(e.target.value)}
                      placeholder="Reason for escalation"
                      className="h-9 border-white/10 bg-white/5 text-xs text-white"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEscalateOpen(false)}
                        className="flex-1 rounded-lg border border-white/10 py-2 text-xs text-white/60 hover:text-white transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleEscalate}
                        disabled={isSubmitting || !escalateReason.trim()}
                        className="flex-1 rounded-lg bg-[#D44B2E] py-2 text-xs font-bold text-white hover:bg-[#D44B2E]/90 disabled:opacity-50 transition cursor-pointer"
                      >
                        Confirm Escalation
                      </button>
                    </div>
                  </div>
                )}
              </Panel>
            </>
          )}

          {/* ── HISTORY TAB ── */}
          {activeTab === "history" && (
            <section className="space-y-3">
              {customerActivities.map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm"
                >
                  <div className="flex items-center justify-between gap-3 text-xs text-white/50">
                    <span className="font-semibold text-white">{act.action_type}</span>
                    <span>{new Date(act.created_at).toLocaleString()}</span>
                  </div>
                  {act.outcome && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="border-white/10 text-white/70">{act.outcome}</Badge>
                      {act.customer_status_after && (
                        <span className="text-xs text-white/40">
                          → {act.customer_status_after.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  )}
                  {act.notes && <p className="mt-2 text-xs text-white/50">{act.notes}</p>}
                  {act.next_action_date && (
                    <p className="mt-1 text-xs text-[#F5B021]/70">
                      Follow-up: {act.next_action_date}
                    </p>
                  )}
                  {act.recording_url && (
                    <audio controls className="mt-3 h-8 w-full" src={act.recording_url} />
                  )}
                </div>
              ))}
              {customerActivities.length === 0 && (
                <div className="grid place-items-center rounded-xl border border-dashed border-white/10 py-12 text-xs text-white/30">
                  No activity recorded yet
                </div>
              )}
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
