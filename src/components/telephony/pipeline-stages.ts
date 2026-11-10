import {
  AlertOctagon,
  CheckCircle2,
  CreditCard,
  Phone,
  PhoneMissed,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type PipelineStage = {
  id: string;
  title: string;
  statuses: string[];
  icon: LucideIcon;
  accent: string;
  tint: string;
  text: string;
};

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "new_lead",
    title: "New leads",
    statuses: ["new_lead"],
    icon: Sparkles,
    accent: "bg-primary",
    tint: "border-primary/40 bg-primary/5",
    text: "text-primary",
  },
  {
    id: "contacted",
    title: "Initial contact",
    statuses: ["contacted", "qualified"],
    icon: Phone,
    accent: "bg-[#22C55E]",
    tint: "border-[#22C55E]/30 bg-[#22C55E]/5",
    text: "text-[#22C55E]",
  },
  {
    id: "unreachable",
    title: "Wrong No / No Answer",
    statuses: ["unreachable", "no_answer", "wrong_number"],
    icon: PhoneMissed,
    accent: "bg-[#F5B021]",
    tint: "border-[#F5B021]/30 bg-[#F5B021]/5",
    text: "text-[#F5B021]",
  },
  {
    id: "payment_pending",
    title: "Payment promised",
    statuses: ["payment_pending"],
    icon: CreditCard,
    accent: "bg-secondary",
    tint: "border-secondary/50 bg-secondary/10",
    text: "text-secondary-foreground",
  },
  {
    id: "order_submitted",
    title: "Order completed",
    statuses: ["order_submitted", "activation_pending", "activated"],
    icon: CheckCircle2,
    accent: "bg-success",
    tint: "border-success/40 bg-success/10",
    text: "text-success",
  },
  {
    id: "lost",
    title: "Escalated / review",
    statuses: ["lost"],
    icon: AlertOctagon,
    accent: "bg-destructive",
    tint: "border-destructive/40 bg-destructive/10",
    text: "text-destructive",
  },
];

export const OUTCOMES = [
  { code: "NO_ANSWER", label: "No answer (Schedule retry)", status: "contacted", dateRequired: true, nextAction: "Retry: No Answer" },
  { code: "WRONG_NUMBER", label: "Wrong / invalid number", status: "lost", dateRequired: false, nextAction: "Invalid Number" },
  { code: "CALLBACK", label: "Callback", status: "contacted", dateRequired: true, nextAction: "Scheduled Callback" },
  { code: "PAYMENT_PROMISED", label: "Payment promised", status: "payment_pending", dateRequired: true, nextAction: "Payment Promised Follow-up" },
  { code: "SALE", label: "Sale won", status: "payment_pending", dateRequired: true, nextAction: "Process Order" },
  { code: "PAYMENT_RECEIVED", label: "Payment received", status: "activation_pending", dateRequired: true, nextAction: "Awaiting Activation" },
  { code: "ACTIVATED", label: "Activated", status: "activated", dateRequired: false, nextAction: "Order Completed" },
  { code: "NI", label: "Not interested", status: "lost", dateRequired: false, nextAction: "Closed: Not Interested" },
  { code: "DNC", label: "Do not call", status: "lost", dateRequired: false, nextAction: "Closed: DNC" },
] as const;

export type OutcomeCode = (typeof OUTCOMES)[number]["code"];

export function outcomeFor(code: string) {
  return OUTCOMES.find((o) => o.code === code);
}

export function statusForOutcome(code: string, currentStatus: string) {
  return outcomeFor(code)?.status ?? currentStatus;
}

export function stageForStatus(status: string): PipelineStage {
  const stage = PIPELINE_STAGES.find((s) => s.statuses.includes(status));
  return stage ?? PIPELINE_STAGES[0]!;
}

export function stageForCustomer(customer: { status: string; next_action?: string | null } | null | undefined): PipelineStage {
  if (!customer) return PIPELINE_STAGES[0]!;
  if (
    customer.status === "unreachable" ||
    customer.status === "no_answer" ||
    customer.status === "wrong_number" ||
    (customer.status === "contacted" && customer.next_action?.includes("No Answer"))
  ) {
    return PIPELINE_STAGES.find((s) => s.id === "unreachable")!;
  }
  return stageForStatus(customer.status);
}

export function stageForOutcome(code: string, currentStatus: string): PipelineStage {
  if (code === "NO_ANSWER") {
    return PIPELINE_STAGES.find((s) => s.id === "unreachable")!;
  }
  const nextStatus = statusForOutcome(code, currentStatus);
  return stageForStatus(nextStatus);
}
