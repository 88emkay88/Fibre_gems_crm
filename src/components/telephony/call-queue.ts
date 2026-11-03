export type Urgency = "none" | "warm" | "critical";

type QueueCustomer = {
  status: string;
  full_name: string;
  first_name: string;
  surname: string;
  next_action_date?: string | null;
};

export type QueueItem<T extends QueueCustomer> = {
  customer: T;
  daysOverdue: number;
  isNewLead: boolean;
  urgency: Urgency;
};

const DAY_MS = 86_400_000;

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function urgencyFor(daysOverdue: number): Urgency {
  if (daysOverdue >= 3) return "critical";
  if (daysOverdue >= 1) return "warm";
  return "none";
}

export function overdueLabel(daysOverdue: number) {
  return daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`;
}

export function buildCallQueue<T extends QueueCustomer>(
  customers: T[],
  today: string,
): QueueItem<T>[] {
  const items: QueueItem<T>[] = [];

  for (const customer of customers) {
    if (customer.status === "activated" || customer.status === "lost") continue;
    const isNewLead = customer.status === "new_lead";
    const callbackDate = customer.next_action_date ?? null;

    if (callbackDate && callbackDate > today) continue;
    if (!callbackDate && !isNewLead) continue;

    const daysOverdue = callbackDate ? Math.max(0, daysBetween(callbackDate, today)) : 0;
    items.push({ customer, daysOverdue, isNewLead, urgency: urgencyFor(daysOverdue) });
  }

  const rank = (item: QueueItem<T>) =>
    item.daysOverdue > 0 ? 0 : item.customer.next_action_date ? 1 : 2;

  return items.sort((a, b) => {
    const byRank = rank(a) - rank(b);
    if (byRank) return byRank;
    if (a.isNewLead !== b.isNewLead) return a.isNewLead ? -1 : 1;
    if (b.daysOverdue !== a.daysOverdue) return b.daysOverdue - a.daysOverdue;
    return (a.customer.full_name || "").localeCompare(b.customer.full_name || "");
  });
}
