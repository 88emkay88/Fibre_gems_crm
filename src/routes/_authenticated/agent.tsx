import { createFileRoute } from "@tanstack/react-router";
import { CrmWorkspace } from "@/components/crm-workspaces";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({ meta: [
    { title: "Agent Workspace — FibreGems CRM" },
    { name: "description", content: "Daily call backs, assigned leads, lead capture and activity for FibreGems agents." },
    { property: "og:title", content: "Agent Workspace — FibreGems CRM" },
    { property: "og:description", content: "Daily call backs, assigned leads, lead capture and activity for FibreGems agents." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: () => <CrmWorkspace mode="agent" />,
});
