import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Career Chronicles" },
      {
        name: "description",
        content:
          "Log in or sign up to save your Career Mode careers, squad data and player growth in the cloud.",
      },
      { property: "og:title", content: "Sign in — Career Chronicles" },
      {
        property: "og:description",
        content: "Access your careers, squads and season history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/karrierer` },
        });
        if (error) throw error;
        toast.success("Account created. You are logged in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        void navigate({ to: "/karrierer" });
      } else {
        toast.info("Check your email to confirm the account.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Log in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google log in failed.");
        return;
      }
      if (result.redirected) return;
      void navigate({ to: "/karrierer" });
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "h-11 rounded-[10px] border-ov-control bg-ov-bg text-ov-text placeholder:text-ov-muted focus-visible:ring-ov-accent";

  return (
    <div className="landing-dark flex min-h-screen flex-col items-center justify-center bg-ov-bg px-5 py-12 text-ov-text">
      <div className="w-full max-w-sm rounded-2xl border border-ov-border bg-ov-card p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size={44} className="h-11 w-11 shrink-0" />
          <h1 className="font-tight mt-4 text-2xl font-bold tracking-[-0.03em]">Career Chronicles</h1>
          <p className="mt-1 text-sm text-ov-muted">
            {mode === "login" ? "Sign in to your Career Mode saves" : "Create your account"}
          </p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium text-ov-muted">Email</Label>
            <Input id="email" type="email" autoComplete="email" required value={email}
              className={inputCls} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs font-medium text-ov-muted">Password</Label>
            <Input id="password" type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required minLength={6} value={password} className={inputCls}
              onChange={(event) => setPassword(event.target.value)} />
            <div className="flex justify-end">
              <button type="button" className="text-xs text-ov-muted hover:text-ov-text"
                onClick={() => toast.info("Password reset is coming soon.")}>
                Forgot password?
              </button>
            </div>
          </div>
          <Button type="submit" disabled={busy}
            className="h-11 w-full rounded-[10px] bg-ov-accent font-semibold text-ov-bg hover:bg-ov-accent/90">
            {mode === "login" ? "Sign in" : "Sign up"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-ov-muted">
          <span className="h-px flex-1 bg-ov-line" />
          or
          <span className="h-px flex-1 bg-ov-line" />
        </div>

        <Button type="button" variant="outline" disabled={busy} onClick={() => void handleGoogle()}
          className="h-11 w-full gap-2 rounded-[10px] border-ov-control bg-transparent text-ov-text hover:bg-ov-line hover:text-ov-text">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
            <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.6 3.8-5.4 3.8-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
          </svg>
          Continue with Google
        </Button>

        <p className="mt-6 text-center text-sm text-ov-muted">
          {mode === "login" ? "New to Career Chronicles?" : "Already have an account?"}{" "}
          <button type="button" className="font-medium text-ov-text hover:underline"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
      <div className="mt-6 flex gap-4 text-xs text-ov-muted">
        <Link to="/privacy" className="hover:text-ov-text">Privacy</Link>
        <Link to="/terms" className="hover:text-ov-text">Terms</Link>
      </div>
    </div>
  );
}
