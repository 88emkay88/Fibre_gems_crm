import { useState } from "react";
import { createPortal } from "react-dom";
import { Phone, PhoneMissed, PhoneOff, CalendarClock, CreditCard, AlertTriangle, CheckCircle2 } from "lucide-react";
import { LeadCard } from "./LeadCard";
import { LeadQueue } from "./LeadQueue";
import { PipelineBoard } from "./PipelineBoard";
import type { QueueItem } from "./call-queue";
import { PIPELINE_STAGES, stageForCustomer, OUTCOMES, outcomeFor, statusForOutcome } from "./pipeline-stages";
import type { Customer } from "./types";
import { useKanbanDrag } from "./use-kanban-drag";
import { useStageFlash } from "./use-stage-flash";
import { jhbDateOffset } from "./telephony-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MoveOptions {
  nextActionDate?: string | null;
  nextAction?: string | null;
  notes?: string | null;
  outcome?: string | null;
}

interface KanbanViewProps {
  queue: QueueItem<Customer>[];
  customers: Customer[];
  today: string;
  activeDialingId?: string | null | undefined;
  callDurationSeconds?: number;
  onSelectCustomer: (customer: Customer) => void;
  onCallCustomer: (customer: Customer) => void;
  onHangup?: (() => void) | undefined;
  onMoveCustomer: (customerId: string, targetStatus: string, options?: MoveOptions) => void;
}

export function KanbanView({
  queue,
  customers,
  today,
  activeDialingId,
  callDurationSeconds = 0,
  onSelectCustomer,
  onCallCustomer,
  onHangup,
  onMoveCustomer,
}: KanbanViewProps) {
  const flashIds = useStageFlash(customers);

  // Unreachable drop verification
  const [unreachableCustomer, setUnreachableCustomer] = useState<Customer | null>(null);
  const [unreachableType, setUnreachableType] = useState<"no_answer" | "wrong_number">("no_answer");
  const [unreachableDate, setUnreachableDate] = useState(() => jhbDateOffset(1));
  const [unreachableNotes, setUnreachableNotes] = useState("");

  // Payment pending drop verification
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentDate, setPaymentDate] = useState(() => jhbDateOffset(3));
  const [paymentNotes, setPaymentNotes] = useState("");

  // Initial contact drop verification modal
  const [contactedCustomer, setContactedCustomer] = useState<Customer | null>(null);
  const [contactedOutcome, setContactedOutcome] = useState("CALLBACK");
  const [contactedDate, setContactedDate] = useState(() => jhbDateOffset(1));
  const [contactedNotes, setContactedNotes] = useState("");

  const drag = useKanbanDrag({
    onSelect: onSelectCustomer,
    onDrop: (customer, stageId) => {
      const currentStage = stageForCustomer(customer);
      if (currentStage.id === stageId) return;

      if (stageId === "contacted") {
        setContactedCustomer(customer);
        setContactedOutcome("CALLBACK");
        setContactedDate(jhbDateOffset(1));
        setContactedNotes("");
        return;
      }

      if (stageId === "unreachable") {
        setUnreachableCustomer(customer);
        setUnreachableType("no_answer");
        setUnreachableDate(jhbDateOffset(1));
        setUnreachableNotes("Unanswered call - scheduled retry");
        return;
      }

      if (stageId === "payment_pending") {
        setPaymentCustomer(customer);
        setPaymentDate(jhbDateOffset(3));
        setPaymentNotes("Promise to pay agreed");
        return;
      }

      const stage = PIPELINE_STAGES.find((s) => s.id === stageId);
      const targetStatus = stage?.statuses[0];
      if (!stage || !targetStatus) return;
      onMoveCustomer(customer.id, targetStatus);
    },
  });

  const handleConfirmContacted = () => {
    if (!contactedCustomer) return;
    const outcomeObj = outcomeFor(contactedOutcome);
    const targetStatus = statusForOutcome(contactedOutcome, "contacted");
    const needsDate = outcomeObj?.dateRequired ?? false;
    onMoveCustomer(contactedCustomer.id, targetStatus, {
      outcome: contactedOutcome,
      nextAction: outcomeObj?.nextAction || "Initial Contact Follow-up",
      nextActionDate: needsDate ? contactedDate : null,
      notes: contactedNotes.trim() || null,
    });
    setContactedCustomer(null);
  };

  const handleConfirmUnreachable = () => {
    if (!unreachableCustomer) return;
    if (unreachableType === "no_answer") {
      onMoveCustomer(unreachableCustomer.id, "contacted", {
        outcome: "NO_ANSWER",
        nextAction: "Retry: No Answer",
        nextActionDate: unreachableDate,
        notes: unreachableNotes || "No answer - callback scheduled",
      });
    } else {
      onMoveCustomer(unreachableCustomer.id, "lost", {
        outcome: "WRONG_NUMBER",
        nextAction: "Invalid Number",
        nextActionDate: null,
        notes: unreachableNotes || "Wrong / invalid phone number",
      });
    }
    setUnreachableCustomer(null);
  };

  const handleConfirmPayment = () => {
    if (!paymentCustomer) return;
    onMoveCustomer(paymentCustomer.id, "payment_pending", {
      outcome: "PAYMENT_PROMISED",
      nextAction: "Payment Promised Follow-up",
      nextActionDate: paymentDate,
      notes: paymentNotes || `Customer promised to pay by ${paymentDate}`,
    });
    setPaymentCustomer(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-4">
      <LeadQueue
        items={queue}
        today={today}
        activeDialingId={activeDialingId}
        callDurationSeconds={callDurationSeconds}
        onCallCustomer={onCallCustomer}
        onHangup={onHangup}
        onSelectCustomer={onSelectCustomer}
        drag={drag}
      />
      <div className="min-w-0 lg:col-span-3">
        <PipelineBoard
          customers={customers}
          drag={drag}
          flashIds={flashIds}
          onCallCustomer={onCallCustomer}
          onHangup={onHangup}
          onSelectCustomer={onSelectCustomer}
          activeDialingId={activeDialingId}
          callDurationSeconds={callDurationSeconds}
        />
      </div>

      {drag.source &&
        createPortal(
          <div
            ref={drag.overlayRef}
            className="pointer-events-none fixed left-0 top-0 z-50"
            style={{
              width: drag.source.width,
              transform: `translate3d(${drag.source.x - drag.source.offsetX}px, ${drag.source.y - drag.source.offsetY}px, 0)`,
            }}
          >
            <div className="rotate-2 scale-[1.03] shadow-2xl">
              <LeadCard customer={drag.source.customer} onCall={onCallCustomer} />
            </div>
          </div>,
          document.body,
        )}

      {/* Initial Contact Outcome Modal */}
      {contactedCustomer && (
        <Dialog open onOpenChange={(open) => !open && setContactedCustomer(null)} modal={false}>
          <DialogContent hideOverlay onInteractOutside={(e) => e.preventDefault()} className="border border-white/10 bg-[#141414] text-white sm:max-w-md pointer-events-auto shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-[#22C55E]">
                <Phone className="size-5" />
                <DialogTitle className="text-white">Log Initial Contact Outcome</DialogTitle>
              </div>
              <DialogDescription className="text-white/60">
                Log the call outcome for <span className="font-semibold text-white">{contactedCustomer.full_name || contactedCustomer.first_name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs text-white/80">Outcome</Label>
                <select
                  value={contactedOutcome}
                  onChange={(e) => setContactedOutcome(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-white/10 bg-[#1e1e1e] px-3 text-xs text-white focus:border-[#F5B021]/50 focus:outline-none"
                >
                  {OUTCOMES.map((o) => (
                    <option key={o.code} value={o.code} className="bg-[#1a1a1a]">
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {!!(outcomeFor(contactedOutcome)?.dateRequired) && (
                <div>
                  <Label className="text-xs text-white/80">
                    {contactedOutcome === "PAYMENT_PROMISED" || contactedOutcome === "SALE"
                      ? "Promised Payment Date"
                      : "Next Action / Callback Date"}
                  </Label>
                  <Input
                    type="date"
                    min={today}
                    value={contactedDate}
                    onChange={(e) => setContactedDate(e.target.value)}
                    className="mt-1 h-9 border-white/10 bg-[#1e1e1e] text-xs text-white"
                  />
                  <p className="mt-1 text-[11px] text-white/40">
                    A follow-up task will be added to your queue on this day.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs text-white/80">Notes (Optional)</Label>
                <Input
                  placeholder="e.g. Discussed package options, customer interested"
                  value={contactedNotes}
                  onChange={(e) => setContactedNotes(e.target.value)}
                  className="mt-1 h-9 border-white/10 bg-[#1e1e1e] text-xs text-white"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setContactedCustomer(null)}
                className="text-xs text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmContacted}
                className="bg-[#22C55E] text-xs font-bold text-black hover:bg-[#22C55E]/90"
              >
                Save Outcome & Move
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Unreachable Verification Modal */}
      {unreachableCustomer && (
        <Dialog open onOpenChange={(open) => !open && setUnreachableCustomer(null)} modal={false}>
          <DialogContent hideOverlay onInteractOutside={(e) => e.preventDefault()} className="border border-white/10 bg-[#141414] text-white sm:max-w-md pointer-events-auto shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-[#F5B021]">
                <PhoneMissed className="size-5" />
                <DialogTitle className="text-white">Unreachable Lead Verification</DialogTitle>
              </div>
              <DialogDescription className="text-white/60">
                Verify why <span className="font-semibold text-white">{unreachableCustomer.full_name || unreachableCustomer.first_name}</span> could not be reached.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUnreachableType("no_answer")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    unreachableType === "no_answer"
                      ? "border-[#F5B021] bg-[#F5B021]/15 text-[#F5B021]"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <PhoneMissed className="size-5" />
                  <span>No Answer (Retry)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUnreachableType("wrong_number")}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold transition ${
                    unreachableType === "wrong_number"
                      ? "border-[#D44B2E] bg-[#D44B2E]/15 text-[#D44B2E]"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                  }`}
                >
                  <PhoneOff className="size-5" />
                  <span>Wrong Number (Lost)</span>
                </button>
              </div>

              {unreachableType === "no_answer" ? (
                <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-3">
                  <div>
                    <Label className="text-xs text-white/80">Scheduled Callback Date</Label>
                    <Input
                      type="date"
                      min={today}
                      value={unreachableDate}
                      onChange={(e) => setUnreachableDate(e.target.value)}
                      className="mt-1 h-9 border-white/10 bg-[#1e1e1e] text-xs text-white"
                    />
                    <p className="mt-1 text-[11px] text-white/40">
                      This lead will reappear in your queue on this date.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-white/80">Notes (Optional)</Label>
                    <Input
                      placeholder="e.g. Voicemail left, will retry tomorrow"
                      value={unreachableNotes}
                      onChange={(e) => setUnreachableNotes(e.target.value)}
                      className="mt-1 h-9 border-white/10 bg-[#1e1e1e] text-xs text-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-[#D44B2E]/30 bg-[#D44B2E]/10 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#D44B2E]">
                    <AlertTriangle className="size-4" />
                    <span>Lead will be moved to Lost / Review</span>
                  </div>
                  <div>
                    <Label className="text-xs text-white/80">Reason / Notes (Optional)</Label>
                    <Input
                      placeholder="e.g. Number does not exist or incorrect person"
                      value={unreachableNotes}
                      onChange={(e) => setUnreachableNotes(e.target.value)}
                      className="mt-1 h-9 border-white/10 bg-[#1e1e1e] text-xs text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setUnreachableCustomer(null)}
                className="text-xs text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmUnreachable}
                className={`text-xs font-bold ${
                  unreachableType === "no_answer"
                    ? "bg-[#F5B021] text-black hover:bg-[#F5B021]/90"
                    : "bg-[#D44B2E] text-white hover:bg-[#D44B2E]/90"
                }`}
              >
                {unreachableType === "no_answer" ? "Schedule Retry" : "Confirm Wrong Number"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Promise to Pay Date Picker Modal */}
      {paymentCustomer && (
        <Dialog open onOpenChange={(open) => !open && setPaymentCustomer(null)} modal={false}>
          <DialogContent hideOverlay onInteractOutside={(e) => e.preventDefault()} className="border border-white/10 bg-[#141414] text-white sm:max-w-md pointer-events-auto shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2 text-[#F5B021]">
                <CreditCard className="size-5" />
                <DialogTitle className="text-white">Promise to Pay Follow-Up</DialogTitle>
              </div>
              <DialogDescription className="text-white/60">
                Set the promised payment date for <span className="font-semibold text-white">{paymentCustomer.full_name || paymentCustomer.first_name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs text-white/80">Promised Payment Date</Label>
                <Input
                  type="date"
                  min={today}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="mt-1 h-9 border-white/10 bg-[#1e1e1e] text-xs text-white"
                  required
                />
                <p className="mt-1 text-[11px] text-white/40">
                  A follow-up task will be added to your queue on this day.
                </p>
              </div>

              <div>
                <Label className="text-xs text-white/80">Payment Notes (Optional)</Label>
                <Input
                  placeholder="e.g. Promised to pay R399 via EasyPay on Friday"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="mt-1 h-9 border-white/10 bg-[#1e1e1e] text-xs text-white"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPaymentCustomer(null)}
                className="text-xs text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmPayment}
                className="bg-[#F5B021] text-xs font-bold text-black hover:bg-[#F5B021]/90"
              >
                Set Promise to Pay Date
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
