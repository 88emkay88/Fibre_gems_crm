import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getCurrentUserFn } from "@/server/functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const res = await getCurrentUserFn();
    if (!res?.user) throw redirect({ to: "/" });
    return { user: res.user };
  },
  component: () => <Outlet />,
});