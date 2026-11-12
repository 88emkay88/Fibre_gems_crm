import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "@/server/functions";
import { CallbackPoolView } from "@/components/team-lead/CallbackPoolView";

export const Route = createFileRoute("/_authenticated/team-lead")({
  beforeLoad: async () => {
    const res = await getCurrentUserFn();
    const role = res?.user?.role;
    if (role !== "team_leader" && role !== "admin") throw redirect({ to: "/agent" });
  },
  head: () => ({
    meta: [
      { title: "Team Lead Floor — FibreGems CRM" },
      { name: "description", content: "Review overdue callbacks across the floor and reassign them to agents." },
    ],
  }),
  component: CallbackPoolView,
});
