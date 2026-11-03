import React, { useState, useEffect } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  ChevronDown,
  ChevronUp,
  X,
  Radio,
  Check,
  CreditCard,
  RefreshCw,
  Save,
  Copy,
  Clock,
  Calendar,
  AlertTriangle,
  History,
  User,
  MapPin,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import type { Customer, ActivityRow, AgentTelephonyState } from "./types";
import {
  formatCallTime,
  jhbDateOffset,
  submitDispositionApi,
  updateStageApi,
  updateCustomerDetailsApi,
  reissueEasyPayApi,
  hangupCallApi,
  setCallHoldApi,
  setCallMuteApi,
} from "./telephony-service";

const DISPOSITIONS = [
  { value: "SALE", label: "Sale Won" },
  { value: "CALLBACK", label: "Callback Required" },
  { value: "PAYMENT_PROMISED", label: "Payment Promised" },
  { value: "NI", label: "Not Interested" },
  { value: "DNC", label: "Do Not Call" },
];

const STAGES = [
  { id: "new_lead", label: "New Lead", color: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  { id: "contacted", label: "Contacted", color: "bg-purple-500/20 text-purple-400 border-purple-500/40" },
  { id: "qualified", label: "Qualified", color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" },
  { id: "payment_pending", label: "Payment Pending", color: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
  { id: "order_submitted", label: "Order Placed", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" },
  { id: "activated", label: "Activated", color: "bg-green-500/20 text-green-400 border-green-500/40" },
  { id: "lost", label: "Lost / Closed", color: "bg-red-500/20 text-red-400 border-red-500/40" },
];

const PACKAGES = [
  "Vuma Reach 10Mbps/10Mbps",
  "Vuma Reach 20Mbps/10Mbps",
  "Vuma Reach 50Mbps/25Mbps",
  "Vuma Reach 100Mbps/50Mbps",
];

interface CustomerCallCommandModalProps {
  customer: Customer | null;
  activities: ActivityRow[];
  isOpen: boolean;
  telephonyState: AgentTelephonyState;
  setTelephonyState: React.Dispatch<React.SetStateAction<AgentTelephonyState>>;
  onClose: () => void;
  onCall: (customer: Customer) => void;
  onCustomerUpdated: (updatedCustomer: Customer) => void;
  onRefreshData: () => void;
}

export function CustomerCallCommandModal({
  customer,
  activities,
  isOpen,
  telephonyState,
  setTelephonyState,
  onClose,
  onCall,
  onCustomerUpdated,
  onRefreshData,
}: CustomerCallCommandModalProps) {
  // Retracted state (docked bottom bar) vs Risen Up (full customer screen)
  const [isRetracted, setIsRetracted] = useState(false);

  // Editable customer form fields
  const [formData, setFormData] = useState({
    firstName: "",
    surname: "",
    cellNumber: "",
    altNumber: "",
    email: "",
    fullAddress: "",
    areaSuburb: "",
    productPackage: "",
    paymentType: "Prepaid",
  });

  // Outcome & logging
  const [selectedDispo, setSelectedDispo] = useState("CALLBACK");
  const [callbackDate, setCallbackDate] = useState(() => jhbDateOffset(1));
  const [callNotes, setCallNotes] = useState("");
  const [activeTab, setActiveTab] = useState<"lead" | "timeline" | "easypay">("lead");
  const [isSaving, setIsSaving] = useState(false);

  // Sync form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        firstName: customer.first_name || "",
        surname: customer.surname || "",
        cellNumber: customer.cell_number || "",
        altNumber: customer.alternate_cell_number || "",
        email: customer.email || "",
        fullAddress: customer.full_address || "",
        areaSuburb: customer.area_suburb || "",
        productPackage: customer.product_package || (PACKAGES[0] as string),
        paymentType: customer.payment_type || "Prepaid",
      });
    }
  }, [customer]);

  const isCallActive =
    telephonyState.agentStatus === "in_call" || telephonyState.agentStatus === "dialing";
  const isCurrentCallLead = Boolean(
    isCallActive && customer && telephonyState.activeCustomerId === customer.id
  );

  if (!isOpen || !customer) return null;

  const customerActivities = activities.filter((a) => a.customer_id === customer.id);
  const fullName = customer.full_name || `${formData.firstName} ${formData.surname}`.trim();

  // Handle stage change with instant sync
  const handleStageSelect = async (newStatus: string) => {
    const updated = { ...customer, status: newStatus };
    onCustomerUpdated(updated);
    toast.success(`Stage updated to ${newStatus.replace(/_/g, " ")}`);
    await updateStageApi(customer.id, newStatus);
    onRefreshData();
  };

  // Save edited customer contact details
  const handleSaveDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await updateCustomerDetailsApi(customer.id, {
        first_name: formData.firstName,
        surname: formData.surname,
        alternate_cell_number: formData.altNumber || null,
        email: formData.email || null,
        full_address: formData.fullAddress || null,
        area_suburb: formData.areaSuburb || null,
        product_package: formData.productPackage || null,
        payment_type: formData.paymentType || null,
      });

      const updated: Customer = {
        ...customer,
        first_name: formData.firstName,
        surname: formData.surname,
        full_name: `${formData.firstName} ${formData.surname}`.trim(),
        alternate_cell_number: formData.altNumber || null,
        email: formData.email || null,
        full_address: formData.fullAddress || null,
        area_suburb: formData.areaSuburb || null,
        product_package: formData.productPackage || null,
        payment_type: formData.paymentType || null,
      };

      onCustomerUpdated(updated);
      toast.success("Lead details updated and synced");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save details");
    } finally {
      setIsSaving(false);
    }
  };

  // Save disposition and log outcome
  const handleSaveDisposition = async () => {
    const needsDate = selectedDispo !== "NI" && selectedDispo !== "DNC";
    if (needsDate && !callbackDate) {
      toast.error("Please pick a callback date");
      return;
    }

    setIsSaving(true);
    try {
      await submitDispositionApi({
        customerId: customer.id,
        disposition: selectedDispo,
        notes: callNotes || `Call completed with outcome: ${selectedDispo}`,
        callbackDate: needsDate ? callbackDate : null,
      });

      // Update lead stage based on disposition
      const statusMap: Record<string, string> = {
        SALE: "order_submitted",
        PAYMENT_PROMISED: "payment_pending",
        CALLBACK: "contacted",
        NI: "lost",
        DNC: "lost",
      };
      const newStatus = statusMap[selectedDispo] || "contacted";
      onCustomerUpdated({ ...customer, status: newStatus, next_action_date: callbackDate });

      // Reset active call state
      setTelephonyState((prev) => ({
        ...prev,
        activeCustomerId: null,
        activeCustomerName: null,
        activeCustomerPhone: null,
        callDurationSeconds: 0,
        agentStatus: "ready",
        isMuted: false,
        isOnHold: false,
      }));

      setCallNotes("");
      toast.success("Disposition logged & synced");
      onRefreshData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save disposition");
    } finally {
      setIsSaving(false);
    }
  };

  // Telephony controls
  const handleHangup = async () => {
    setTelephonyState((prev) => ({
      ...prev,
      agentStatus: "ready",
      activeCustomerId: null,
      activeCustomerName: null,
      activeCustomerPhone: null,
      callDurationSeconds: 0,
      isMuted: false,
      isOnHold: false,
    }));
    toast.info("Call ended / dropped");
    try {
      await hangupCallApi();
    } catch {
      // Backend not yet configured
    }
  };

  const handleToggleMute = async () => {
    const nextMuted = !telephonyState.isMuted;
    setTelephonyState((prev) => ({ ...prev, isMuted: nextMuted }));
    toast.info(nextMuted ? "Microphone muted" : "Microphone unmuted");
    try {
      await setCallMuteApi(nextMuted);
    } catch {
      // Backend not yet configured
    }
  };

  const handleToggleHold = async () => {
    const nextHold = !telephonyState.isOnHold;
    setTelephonyState((prev) => ({ ...prev, isOnHold: nextHold }));
    toast.info(nextHold ? "Call on hold" : "Call resumed");
    try {
      await setCallHoldApi(nextHold);
    } catch {
      // Backend not yet configured
    }
  };

  const handleReissueEP = async () => {
    setIsSaving(true);
    const res = await reissueEasyPayApi(customer.id);
    setIsSaving(false);
    if (res?.new_expiry) {
      onCustomerUpdated({ ...customer, easypay_expiry_date: res.new_expiry });
    }
    onRefreshData();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. RETRACTED VIEW (Docked Bottom Bar when busy / retracted)
  // ─────────────────────────────────────────────────────────────────────────
  if (isRetracted) {
    return (
      <aside aria-label="Active Call Dock" className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2">
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#111111]/95 p-3 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
          {/* Top row: Status, Recording, Customer, Timer, Controls, Expand button */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex min-w-0 items-center gap-3">
              {/* Call Status Badge */}
              {isCurrentCallLead ? (
                <span className="flex items-center gap-1.5 rounded-full bg-[#22C55E]/20 px-2.5 py-1 text-xs font-bold text-[#22C55E] border border-[#22C55E]/40 animate-pulse">
                  <span className="size-2 rounded-full bg-[#22C55E] animate-ping" />
                  <Radio className="size-3.5" />
                  LIVE CALL
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white/70">
                  {customer.status.replace(/_/g, " ").toUpperCase()}
                </span>
              )}

              {/* Automatic Recording Indicator */}
              {isCurrentCallLead && (
                <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-400 border border-red-500/30">
                  <span className="size-2 rounded-full bg-red-500 animate-ping" />
                  REC AUTO-RECORDING
                </span>
              )}

              {/* Customer summary */}
              <div className="min-w-0">
                <p
                  onClick={() => setIsRetracted(false)}
                  title="Click name to view full customer details"
                  className="truncate text-sm font-bold text-white hover:text-[#F5B021] cursor-pointer hover:underline transition-colors"
                >
                  {fullName}
                </p>
                <p className="truncate font-mono text-xs text-white/50">{customer.cell_number}</p>
              </div>
            </div>

            {/* Right: Live Timer, Call Controls & Rise Up button */}
            <div className="flex items-center gap-2">
              {isCurrentCallLead && (
                <>
                  <span className="font-mono text-base font-bold tabular-nums text-[#22C55E] bg-[#22C55E]/10 px-2.5 py-1 rounded-lg border border-[#22C55E]/20">
                    {formatCallTime(telephonyState.callDurationSeconds)}
                  </span>

                  <button
                    onClick={handleToggleMute}
                    title={telephonyState.isMuted ? "Unmute" : "Mute"}
                    className={`grid size-8 place-items-center rounded-lg border transition ${
                      telephonyState.isMuted
                        ? "border-red-500/50 bg-red-500/20 text-red-400"
                        : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                    }`}
                  >
                    {telephonyState.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  </button>

                  <button
                    onClick={handleToggleHold}
                    title={telephonyState.isOnHold ? "Resume" : "Hold"}
                    className={`grid size-8 place-items-center rounded-lg border transition ${
                      telephonyState.isOnHold
                        ? "border-[#F5B021]/50 bg-[#F5B021]/20 text-[#F5B021]"
                        : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                    }`}
                  >
                    {telephonyState.isOnHold ? <Play className="size-4" /> : <Pause className="size-4" />}
                  </button>

                  <button
                    onClick={handleHangup}
                    title="Hang up"
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-[#D44B2E] px-3 text-xs font-bold text-white hover:bg-[#D44B2E]/90 shadow-md shadow-[#D44B2E]/30"
                  >
                    <PhoneOff className="size-3.5" />
                    Hangup
                  </button>
                </>
              )}

              {/* Rise Up / Expand Details Button */}
              <button
                onClick={() => setIsRetracted(false)}
                className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#D44B2E] to-[#F5B021] px-3 text-xs font-bold text-black shadow-lg shadow-[#F5B021]/20 hover:opacity-90"
              >
                <ChevronUp className="size-4" />
                Rise Up (Details)
              </button>
            </div>
          </div>

          {/* Quick Outcome Bar while in retracted mode */}
          <div className="flex items-center gap-2 border-t border-white/5 pt-2">
            <select
              value={selectedDispo}
              onChange={(e) => setSelectedDispo(e.target.value)}
              aria-label="Outcome disposition"
              className="h-8 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-white focus:border-[#F5B021]/50 focus:outline-none"
            >
              {DISPOSITIONS.map((d) => (
                <option key={d.value} value={d.value} className="bg-[#1a1a1a] text-white">
                  {d.label}
                </option>
              ))}
            </select>

            {selectedDispo !== "NI" && selectedDispo !== "DNC" && (
              <input
                type="date"
                value={callbackDate}
                min={jhbDateOffset(0)}
                onChange={(e) => setCallbackDate(e.target.value)}
                aria-label="Callback date"
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs text-white focus:border-[#F5B021]/50 focus:outline-none"
              />
            )}

            <button
              onClick={handleSaveDisposition}
              disabled={isSaving}
              className="flex h-8 items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 px-3 text-xs font-bold text-white transition disabled:opacity-40"
            >
              <Check className="size-3.5 text-[#22C55E]" />
              Save Outcome
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. RISEN UP VIEW (Full Customer Command Screen & Lead Editor)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsRetracted(true);
      }}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative mx-auto flex max-h-[88vh] w-full max-w-6xl flex-col rounded-t-[24px] border border-b-0 border-white/10 bg-[#0e0e0e] shadow-[0_-20px_80px_rgba(0,0,0,0.95)] animate-in slide-in-from-bottom duration-300">
        
        {/* ── Modal Header & Telemetry Bar ────────────────────────────── */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 bg-[#121212] px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[#D44B2E] to-[#F5B021] text-base font-bold text-black shadow-lg shadow-[#F5B021]/20">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">{fullName}</h2>
                {customer.easypay_number && (
                  <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-[#F5B021]">
                    EP {customer.easypay_number}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">{customer.area_suburb || "Area not specified"}</p>
            </div>
          </div>

          {/* Center: Live Call Telemetry & Recording Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {isCurrentCallLead ? (
              <div className="flex items-center gap-3 rounded-full border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-1.5 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#22C55E]">
                  <span className="size-2 rounded-full bg-[#22C55E] animate-ping" />
                  LIVE CALL
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-white">
                  {formatCallTime(telephonyState.callDurationSeconds)}
                </span>
              </div>
            ) : (
              <button
                onClick={() => onCall(customer)}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#D44B2E] to-[#F5B021] px-5 py-2 text-xs font-bold text-black shadow-lg shadow-[#F5B021]/20 hover:opacity-90"
              >
                <Phone className="size-3.5" />
                Call Customer
              </button>
            )}

            {/* Audio Recording Badge (Required on Agent Side) */}
            {isCurrentCallLead && (
              <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5">
                <span className="size-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-[11px] font-bold text-red-400">REC AUTO-RECORDING ACTIVE</span>
                <div className="flex items-center gap-0.5">
                  <span className="h-3 w-0.5 bg-red-400 animate-pulse" />
                  <span className="h-4 w-0.5 bg-red-400 animate-pulse delay-75" />
                  <span className="h-2 w-0.5 bg-red-400 animate-pulse delay-150" />
                  <span className="h-3.5 w-0.5 bg-red-400 animate-pulse delay-100" />
                </div>
              </div>
            )}
          </div>

          {/* Right: Retract Down (Shrink), Controls & Dismiss */}
          <div className="flex items-center gap-2">
            {isCurrentCallLead && (
              <>
                <button
                  onClick={handleToggleMute}
                  title={telephonyState.isMuted ? "Unmute" : "Mute"}
                  className={`grid size-9 place-items-center rounded-lg border transition ${
                    telephonyState.isMuted
                      ? "border-red-500/50 bg-red-500/20 text-red-400"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  {telephonyState.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </button>
                <button
                  onClick={handleToggleHold}
                  title={telephonyState.isOnHold ? "Resume" : "Hold"}
                  className={`grid size-9 place-items-center rounded-lg border transition ${
                    telephonyState.isOnHold
                      ? "border-[#F5B021]/50 bg-[#F5B021]/20 text-[#F5B021]"
                      : "border-white/10 bg-white/5 text-white/70 hover:text-white"
                  }`}
                >
                  {telephonyState.isOnHold ? <Play className="size-4" /> : <Pause className="size-4" />}
                </button>
                <button
                  onClick={handleHangup}
                  className="flex h-9 items-center gap-1.5 rounded-lg bg-[#D44B2E] px-3.5 text-xs font-bold text-white hover:bg-[#D44B2E]/90 shadow-md shadow-[#D44B2E]/30"
                >
                  <PhoneOff className="size-3.5" />
                  Hangup
                </button>
              </>
            )}

            {/* Retract Down Button */}
            <button
              onClick={() => setIsRetracted(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
              title="Retract down to dock"
            >
              <ChevronDown className="size-4" />
              Retract (Shrink)
            </button>

            <button
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition hover:bg-white/10 hover:text-white"
              title="Close modal"
            >
              <X className="size-4" />
            </button>
          </div>
        </header>

        {/* ── Stage Selector Bar (Syncs instantly with Board & Modal) ─── */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/5 bg-[#121212]/50 px-6 py-2.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 shrink-0">
            Current Stage:
          </span>
          <div className="flex items-center gap-1.5">
            {STAGES.map((s) => {
              const active = customer.status === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleStageSelect(s.id)}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition border ${
                    active
                      ? `${s.color} ring-1 ring-white/20 shadow-sm`
                      : "border-white/5 bg-white/[0.02] text-white/40 hover:bg-white/5 hover:text-white/80"
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Content Body ───────────────────────────────────────── */}
        <div className="grid flex-1 overflow-y-auto p-6 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Editable Customer Details Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveDetails} className="space-y-5 rounded-2xl border border-white/5 bg-[#141414] p-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#F5B021]">
                  <User className="size-4" />
                  Lead Contact Information
                </h3>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#D44B2E] to-[#F5B021] px-4 text-xs font-bold text-black shadow-md hover:opacity-90 disabled:opacity-40"
                >
                  <Save className="size-3.5" />
                  {isSaving ? "Saving..." : "Save Details"}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">First Name</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Surname</label>
                  <input
                    type="text"
                    value={formData.surname}
                    onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Primary Cell Phone</label>
                  <input
                    type="text"
                    value={formData.cellNumber}
                    onChange={(e) => setFormData({ ...formData, cellNumber: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 font-mono text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Alternate Phone</label>
                  <input
                    type="text"
                    value={formData.altNumber}
                    onChange={(e) => setFormData({ ...formData, altNumber: e.target.value })}
                    placeholder="e.g. 082 123 4567"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 font-mono text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="customer@example.com"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Physical Street Address</label>
                  <input
                    type="text"
                    value={formData.fullAddress}
                    onChange={(e) => setFormData({ ...formData, fullAddress: e.target.value })}
                    placeholder="e.g. 14 Gemsbok Street, Ext 4"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Suburb / Area</label>
                  <input
                    type="text"
                    value={formData.areaSuburb}
                    onChange={(e) => setFormData({ ...formData, areaSuburb: e.target.value })}
                    placeholder="e.g. Soweto, Vosloorus"
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Product Package</label>
                  <select
                    value={formData.productPackage}
                    onChange={(e) => setFormData({ ...formData, productPackage: e.target.value })}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  >
                    {PACKAGES.map((pkg) => (
                      <option key={pkg} value={pkg} className="bg-[#1a1a1a] text-white">
                        {pkg}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </form>

            {/* EasyPay Financial Tracker Panel */}
            <div className="rounded-2xl border border-white/5 bg-[#141414] p-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#F5B021]">
                  <CreditCard className="size-4" />
                  EasyPay & Payment Tracker
                </h3>
                <button
                  type="button"
                  onClick={handleReissueEP}
                  disabled={isSaving}
                  className="flex h-8 items-center gap-1.5 rounded-lg border border-[#F5B021]/40 bg-[#F5B021]/10 px-3 text-xs font-bold text-[#F5B021] hover:bg-[#F5B021]/20 transition disabled:opacity-40"
                >
                  <RefreshCw className="size-3.5" />
                  Re-issue EP (+14 Days)
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">EasyPay Number</p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#F5B021]">
                    {customer.easypay_number || "Awaiting Assignment"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">EasyPay Cycle</p>
                  <p className="mt-1 text-sm font-bold text-white">Cycle {customer.easypay_cycle || "1"}</p>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Expiration Date</p>
                  <p className="mt-1 font-mono text-sm font-bold text-white">
                    {customer.easypay_expiry_date || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Outcome Logger & Call Timeline */}
          <div className="space-y-6">
            
            {/* Quick Outcome Logger */}
            <div className="rounded-2xl border border-white/5 bg-[#141414] p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#F5B021] mb-3">
                <Clock className="size-4" />
                Log Call Outcome & Notes
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Outcome</label>
                  <select
                    value={selectedDispo}
                    onChange={(e) => setSelectedDispo(e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                  >
                    {DISPOSITIONS.map((d) => (
                      <option key={d.value} value={d.value} className="bg-[#1a1a1a] text-white">
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedDispo !== "NI" && selectedDispo !== "DNC" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Next Callback Date</label>
                    <input
                      type="date"
                      value={callbackDate}
                      min={jhbDateOffset(0)}
                      onChange={(e) => setCallbackDate(e.target.value)}
                      className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-xs text-white focus:border-[#F5B021]/60 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Agent Notes</label>
                  <textarea
                    rows={3}
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Enter call notes or next action details..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white placeholder-white/30 focus:border-[#F5B021]/60 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSaveDisposition}
                  disabled={isSaving}
                  className="w-full h-10 rounded-lg bg-gradient-to-r from-[#D44B2E] to-[#F5B021] font-bold text-xs text-black shadow-lg shadow-[#F5B021]/20 hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
                >
                  <Check className="size-4" />
                  Save Outcome & Sync Lead
                </button>
              </div>
            </div>

            {/* Interaction History & Timeline */}
            <div className="rounded-2xl border border-white/5 bg-[#141414] p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
                <History className="size-4" />
                Previous Interactions ({customerActivities.length})
              </h3>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {customerActivities.map((act) => (
                  <div key={act.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs">
                    <div className="flex items-center justify-between text-white/40">
                      <span className="font-bold text-white/80">{act.action_type}</span>
                      <span>{new Date(act.created_at).toLocaleDateString()}</span>
                    </div>
                    {act.outcome && (
                      <span className="inline-block mt-1 rounded bg-[#F5B021]/15 px-2 py-0.5 text-[10px] font-bold text-[#F5B021]">
                        {act.outcome}
                      </span>
                    )}
                    {act.notes && <p className="mt-1 text-white/60">{act.notes}</p>}
                    {act.recording_url && (
                      <audio controls className="mt-2 h-7 w-full" src={act.recording_url} />
                    )}
                  </div>
                ))}

                {customerActivities.length === 0 && (
                  <p className="text-center py-6 text-xs text-white/30 border border-dashed border-white/5 rounded-xl">
                    No prior interactions logged
                  </p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
