import {
  AlertOctagon,
  CheckCircle2,
  CreditCard,
  Phone,
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
    accent: "bg-foreground",
    tint: "border-foreground/25 bg-foreground/[0.03]",
    text: "text-foreground",
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

export function stageForStatus(status: string): PipelineStage {
  const stage = PIPELINE_STAGES.find((s) => s.statuses.includes(status));
  return stage ?? PIPELINE_STAGES[0]!;
}
