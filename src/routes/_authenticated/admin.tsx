import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CrmWorkspace } from "@/components/crm-workspaces";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user?.id ?? "").eq("role", "admin").maybeSingle();
    if (!data) throw redirect({ to: "/agent" });
  },
  head: () => ({ meta: [
    { title: "Admin Command Centre — FibreGems CRM" },
    { name: "description", content: "Oversee agents, callback compliance, the master grid and Agility syncing." },
    { property: "og:title", content: "Admin Command Centre — FibreGems CRM" },
    { property: "og:description", content: "Oversee agents, callback compliance, the master grid and Agility syncing." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
  component: () => <CrmWorkspace mode="admin" />,
});
