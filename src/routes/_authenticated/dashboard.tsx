import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user?.id ?? "").eq("role", "admin").maybeSingle();
    throw redirect({ to: data ? "/admin" : "/agent" });
  },
  head: () => ({ meta: [
    { title: "Command Centre — FibreGems CRM" },
    { name: "description", content: "Manage FibreGems customers, actions, orders, payments and activations." },
    { property: "og:title", content: "Command Centre — FibreGems CRM" },
    { property: "og:description", content: "Manage FibreGems customers, actions, orders, payments and activations." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ]}),
});
