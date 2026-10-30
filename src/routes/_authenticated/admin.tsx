import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "@/server/functions";
import { CrmWorkspace } from "@/components/crm-workspaces";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const res = await getCurrentUserFn();
    if (res?.user?.role !== "admin") throw redirect({ to: "/agent" });
  },
  head: () => ({
    meta: [
      { title: "Admin Command Centre — FibreGems CRM" },
      { name: "description", content: "Oversee agents, callback compliance, the master grid and Agility syncing." },
      { property: "og:title", content: "Admin Command Centre — FibreGems CRM" },
      { property: "og:description", content: "Oversee agents, callback compliance, the master grid and Agility syncing." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <CrmWorkspace mode="admin" />,
});
