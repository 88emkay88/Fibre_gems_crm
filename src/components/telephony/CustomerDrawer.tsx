import React, { useState } from "react";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  History,
  FileText,
  User,
  CheckCircle,
  Play,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { Customer, ActivityRow } from "./types";
import { reissueEasyPayApi, escalateLeadApi, submitDispositionApi } from "./telephony-service";

interface CustomerDrawerProps {
  customer: Customer | null;
  activities: ActivityRow[];
  isOpen: boolean;
  onClose: () => void;
  onCall: (customer: Customer) => void;
  onRefreshData: () => void;
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
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [escalateLevel, setEscalateLevel] = useState("Level 2 - Supervisor Alert");
  const [escalateReason, setEscalateReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!customer) return null;

  const customerActivities = activities.filter((a) => a.customer_id === customer.id);

  const handleReissueEP = async () => {
    setIsSubmitting(true);
    await reissueEasyPayApi(customer.id);
    setIsSubmitting(false);
    onRefreshData();
  };

  const handleEscalate = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setIsSubmitting(true);
    await submitDispositionApi({
      customerId: customer.id,
      disposition: dispoOutcome,
      notes: quickNote,
    });
    setQuickNote("");
    setIsSubmitting(false);
    onRefreshData();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl border-l border-slate-800 bg-slate-950 p-0 text-slate-100 flex flex-col h-full">
        {/* Drawer Header */}
        <div className="border-b border-slate-800 p-6 bg-slate-900/40">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-wider text-primary">
                {customer.external_customer_id || `ID: ${customer.id.slice(0, 8)}`}
              </span>
              <SheetTitle className="text-xl font-bold text-white truncate">
                {customer.full_name || `${customer.first_name} ${customer.surname}`}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-400 mt-0.5">
                {customer.area_suburb || "Area not specified"} · Created {customer.created_at.slice(0, 10)}
              </SheetDescription>
            </div>

            <Button
              size="sm"
              onClick={() => onCall(customer)}
              className="gap-1.5 rounded-lg bg-emerald-600 px-3 font-semibold text-white hover:bg-emerald-500"
            >
              <Phone className="size-3.5" />
              Call Client
            </Button>
          </div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-5">
            <TabsList className="grid w-full grid-cols-3 bg-slate-900 p-1 border border-slate-800">
              <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="financial" className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Orders & EP
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                Timeline ({customerActivities.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Drawer Body Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Contact Information */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" /> Contact Details
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[11px] text-slate-500">Primary Cell</span>
                    <p className="font-mono font-medium text-slate-200">{customer.cell_number}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Alternate Phone</span>
                    <p className="font-mono font-medium text-slate-200">{customer.alternate_cell_number || "—"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-500">Email Address</span>
                    <p className="font-medium text-slate-200">{customer.email || "No email on record"}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[11px] text-slate-500">Physical Street Address</span>
                    <p className="font-medium text-slate-200">{customer.full_address || "—"}</p>
                  </div>
                </div>
              </div>

              {/* Service & Product Configuration */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="size-3.5 text-blue-400" /> Package & Billing
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[11px] text-slate-500">Product Package</span>
                    <p className="font-semibold text-slate-200">{customer.product_package || "Not selected"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Payment Type</span>
                    <p className="font-semibold text-slate-200">{customer.payment_type || "Prepaid"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Pipeline Stage</span>
                    <p className="capitalize font-semibold text-primary">{customer.status.replace("_", " ")}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Next Action</span>
                    <p className="text-slate-200">{customer.next_action || "None scheduled"}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "financial" && (
            <div className="space-y-4">
              {/* EasyPay Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <CreditCard className="size-3.5 text-emerald-400" /> EasyPay Lifecycle
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReissueEP}
                    disabled={isSubmitting}
                    className="h-7 text-xs border-slate-700 bg-slate-800 hover:bg-slate-700"
                  >
                    <RefreshCw className="mr-1 size-3" /> Re-issue (+14d)
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-[11px] text-slate-500">EasyPay Number</span>
                    <p className="font-mono text-base font-bold text-blue-400">{customer.easypay_number || "Not assigned"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Active Cycle</span>
                    <p className="font-semibold text-slate-200">{customer.easypay_cycle || "Cycle 1 of 3"}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Expiry Date</span>
                    <p className="font-mono font-medium text-slate-200">{customer.easypay_expiry_date || "—"}</p>
                  </div>
                </div>
              </div>

              {/* SADV / Order References */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">ISP Order Reference</h4>
                <div className="text-sm">
                  <span className="text-[11px] text-slate-500">OVR / OVK Reference</span>
                  <p className="font-mono font-medium text-slate-200">{customer.order_number || "Awaiting Order Submission"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {customerActivities.map((act) => (
                <div key={act.id} className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="font-semibold text-slate-200">{act.action_type}</span>
                    <span>{new Date(act.created_at).toLocaleString()}</span>
                  </div>
                  {act.outcome && (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="border-slate-700 text-slate-300">
                        {act.outcome}
                      </Badge>
                      {act.customer_status_after && (
                        <span className="text-[10px] text-slate-500">→ {act.customer_status_after}</span>
                      )}
                    </div>
                  )}
                  {act.notes && <p className="text-slate-300 italic">{act.notes}</p>}

                  {/* ViciDial Audio Recording link if available */}
                  {act.recording_url && (
                    <div className="mt-2 pt-2 border-t border-slate-800">
                      <audio controls className="w-full h-8" src={act.recording_url} />
                      <span className="text-[10px] text-slate-500">🎧 ViciDial Stereo Call Recording</span>
                    </div>
                  )}
                </div>
              ))}

              {customerActivities.length === 0 && (
                <div className="py-12 text-center text-xs text-slate-500">No activity logs recorded yet.</div>
              )}
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="border-t border-slate-800 p-4 bg-slate-900/80 space-y-3">
          <div className="flex gap-2">
            <select
              value={dispoOutcome}
              onChange={(e) => setDispoOutcome(e.target.value)}
              className="h-9 rounded-md border border-slate-700 bg-slate-800 px-2.5 text-xs font-semibold text-slate-200 focus:outline-none"
            >
              <option value="CALLBACK">Callback</option>
              <option value="PAYMENT_PROMISED">Payment Promised</option>
              <option value="SALE">Sale Won</option>
              <option value="NI">Not Interested</option>
              <option value="DNC">Do Not Call</option>
            </select>
            <Input
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Add call note or action reason..."
              className="h-9 bg-slate-800/80 border-slate-700 text-xs"
            />
            <Button
              size="sm"
              onClick={handleLogNote}
              disabled={isSubmitting || !quickNote.trim()}
              className="bg-primary text-xs font-semibold"
            >
              Log
            </Button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setEscalateOpen(true)}
              className="text-xs h-7 gap-1"
            >
              <AlertTriangle className="size-3" /> Raise Escalation
            </Button>
            <span className="text-[11px] text-slate-400 font-mono">Agent: Active</span>
          </div>

          {/* Escalation Modal */}
          {escalateOpen && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-300">Escalate Lead</span>
                <button onClick={() => setEscalateOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="size-3.5" />
                </button>
              </div>
              <select
                value={escalateLevel}
                onChange={(e) => setEscalateLevel(e.target.value)}
                className="w-full h-8 rounded border border-slate-700 bg-slate-800 px-2 text-xs text-slate-200"
              >
                <option value="Level 2 - Supervisor Alert">Level 2 - Supervisor Alert</option>
                <option value="Level 3 - Operations Escalation">Level 3 - Operations Escalation</option>
              </select>
              <Input
                value={escalateReason}
                onChange={(e) => setEscalateReason(e.target.value)}
                placeholder="Reason for escalation..."
                className="h-8 text-xs bg-slate-800 border-slate-700"
              />
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEscalate}
                disabled={isSubmitting || !escalateReason.trim()}
                className="w-full h-7 text-xs"
              >
                Confirm Escalation
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

