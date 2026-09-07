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
      { title: "Log ind — Career Chronicles" },
      {
        name: "description",
        content:
          "Log in or sign up to save your FC 26 careers, squad data and player growth in the cloud.",
      },
      { property: "og:title", content: "Log in — Career Chronicles" },
      {
        property: "og:description",
        content: "Access your FC 26 careers, squads and season history.",
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          <BrandLogo size={36} className="h-9 w-9 shrink-0" />
          Career Chronicles
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          {mode === "login" ? "Log in" : "Sign up"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your careers and squad data are saved, so you can track growth across multiple seasons.
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          disabled={busy}
          onClick={() => void handleGoogle()}
        >
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "login" ? "Log in" : "Sign up"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "No account? Sign up" : "Already have an account? Log in"}
        </button>
      </div>
    </div>
  );
}
