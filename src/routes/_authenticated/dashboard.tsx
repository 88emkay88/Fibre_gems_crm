import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "@/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async () => {
    const res = await getCurrentUserFn();
    const role = res?.user?.role;
    throw redirect({ to: role === "admin" ? "/admin" : role === "team_leader" ? "/team-lead" : "/agent" });
  },
  head: () => ({
    meta: [
      { title: "Command Centre — FibreGems CRM" },
      { name: "description", content: "Manage FibreGems customers, actions, orders, payments and activations." },
      { property: "og:title", content: "Command Centre — FibreGems CRM" },
      { property: "og:description", content: "Manage FibreGems customers, actions, orders, payments and activations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
