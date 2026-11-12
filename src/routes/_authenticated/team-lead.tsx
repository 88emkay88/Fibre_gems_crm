import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "@/server/functions";
import { TeamLeadWorkspace } from "@/components/team-lead/TeamLeadWorkspace";

export const Route = createFileRoute("/_authenticated/team-lead")({
  beforeLoad: async () => {
    const res = await getCurrentUserFn();
    const role = res?.user?.role;
    if (role !== "team_leader" && role !== "admin") throw redirect({ to: "/agent" });
  },
  head: () => ({
    meta: [
      { title: "Team Lead Floor — FibreGems CRM" },
      { name: "description", content: "Watch the live floor, step in on calls, and reassign callbacks." },
    ],
  }),
  component: TeamLeadWorkspace,
});
