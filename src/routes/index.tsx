import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — FibreGems CRM" },
      { name: "description", content: "Sign in to the FibreGems CRM to manage leads, orders, payments and activations." },
      { property: "og:title", content: "Sign in — FibreGems CRM" },
      { property: "og:description", content: "Sign in to the FibreGems CRM to manage leads, orders, payments and activations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignIn,
});

type Mode = "signin" | "signup" | "reset";

function SignIn() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    const password = String(f.get("password") ?? "");
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: String(f.get("full_name") ?? "") } },
        });
        if (error) throw error;
        setNotice("Check your inbox to confirm your email, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setNotice("If that email exists, a reset link is on its way.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  async function google() {
    setError(null);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res && "error" in res && res.error) setError(String((res.error as Error).message ?? res.error));
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-brand" />
          <span className="text-xl font-extrabold">FibreGems</span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sidebar-primary">Channel partner CRM</p>
          <h1 className="mt-4 max-w-md text-4xl font-extrabold leading-tight">Every lead, order and activation in one place.</h1>
          <p className="mt-4 max-w-md text-sidebar-muted">Capture customers in the field, track payments, and keep your team's next actions on schedule.</p>
        </div>
        <div className="h-1.5 w-32 rounded-full bg-brand" />
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold">
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back to the command centre." : mode === "signup" ? "New accounts start as agents." : "We'll email you a reset link."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div><Label htmlFor="full_name">Full name</Label><Input id="full_name" name="full_name" required className="mt-1" /></div>
            )}
            <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" className="mt-1" /></div>
            {mode !== "reset" && (
              <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} required autoComplete={mode === "signup" ? "new-password" : "current-password"} className="mt-1" /></div>
            )}
            {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {notice && <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">{notice}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>
          {mode !== "reset" && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
              <Button variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
            </>
          )}
          <div className="mt-6 flex justify-between text-sm">
            {mode === "signin" ? (
              <>
                <button className="text-primary hover:underline" onClick={() => setMode("signup")}>Create account</button>
                <button className="text-muted-foreground hover:underline" onClick={() => setMode("reset")}>Forgot password?</button>
              </>
            ) : (
              <button className="text-primary hover:underline" onClick={() => setMode("signin")}>Back to sign in</button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
