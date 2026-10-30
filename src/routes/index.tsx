import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { loginFn, registerFn, getCurrentUserFn } from "@/server/functions";
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
    getCurrentUserFn().then((res) => {
      if (res?.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "").trim();
    const password = String(f.get("password") ?? "");

    try {
      if (mode === "signin") {
        const res = await loginFn({ data: { email, password } });
        if (res?.success) {
          navigate({ to: "/dashboard" });
        }
      } else if (mode === "signup") {
        const fullName = String(f.get("full_name") ?? "").trim();
        const res = await registerFn({ data: { email, password, fullName } });
        if (res?.success) {
          setNotice("Account created! Redirecting to dashboard...");
          navigate({ to: "/dashboard" });
        }
      } else {
        setNotice("Password reset instructions have been dispatched to your email address.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please check your credentials.");
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(email: string) {
    const emailInput = document.getElementById("email") as HTMLInputElement;
    const passwordInput = document.getElementById("password") as HTMLInputElement;
    if (emailInput && passwordInput) {
      emailInput.value = email;
      passwordInput.value = "password123";
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary" />
          <span className="text-xl font-extrabold">FibreGems</span>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">PostgreSQL Connected CRM</p>
          <h1 className="mt-4 max-w-md text-4xl font-extrabold leading-tight">Every lead, order and activation in one place.</h1>
          <p className="mt-4 max-w-md text-sidebar-muted">Capture customers in the field, track payments, and keep your team's next actions on schedule without external vendor locks.</p>
        </div>
        <div className="h-1.5 w-32 rounded-full bg-primary" />
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-extrabold">
            {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back to the command centre." : mode === "signup" ? "New accounts start as agents." : "We'll send you reset instructions."}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required className="mt-1" placeholder="e.g. Sipho Dlamini" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" className="mt-1" placeholder="agent@fibregems.co.za" />
            </div>
            {mode !== "reset" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" minLength={6} required autoComplete={mode === "signup" ? "new-password" : "current-password"} className="mt-1" />
              </div>
            )}
            {error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
            {notice && <p className="rounded-md bg-accent p-3 text-sm text-accent-foreground">{notice}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset instructions"}
            </Button>
          </form>

          {mode === "signin" && (
            <div className="mt-4 rounded-lg border border-border bg-card p-3 text-xs">
              <p className="font-semibold text-muted-foreground">Quick Demo Credentials:</p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => fillDemo("admin@fibregems.co.za")}>
                  Admin Demo
                </Button>
                <Button variant="outline" size="sm" type="button" onClick={() => fillDemo("agent@fibregems.co.za")}>
                  Agent Demo
                </Button>
              </div>
            </div>
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
