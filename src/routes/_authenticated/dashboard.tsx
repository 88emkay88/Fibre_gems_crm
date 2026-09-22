import { createFileRoute } from "@tanstack/react-router";
import { CrmApp } from "@/components/crm-app";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [
    { title: "Command Centre — FibreGems CRM" },
    { name: "description", content: "Manage FibreGems customers, actions, orders, payments and activations." },
    { property: "og:title", content: "Command Centre — FibreGems CRM" },
    { property: "og:description", content: "Manage FibreGems customers, actions, orders, payments and activations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: CrmApp,
});