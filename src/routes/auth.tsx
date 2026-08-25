import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Log ind — FC Career Companion" },
      {
        name: "description",
        content:
          "Log ind eller opret en konto for at gemme dine FC 26 karrierer, trupdata og udvikling i skyen.",
      },
      { property: "og:title", content: "Log ind — FC Career Companion" },
      {
        property: "og:description",
        content: "Adgang til dine FC 26 karrierer, trupper og sæsonhistorik.",
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
        toast.success("Konto oprettet. Du er logget ind.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        void navigate({ to: "/karrierer" });
      } else {
        toast.info("Tjek din mail for at bekræfte kontoen.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login mislykkedes.");
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
        toast.error("Google-login mislykkedes.");
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
          className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          FC Career Companion
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight">
          {mode === "login" ? "Log ind" : "Opret konto"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dine karrierer og trupdata gemmes, så du kan følge udviklingen over flere sæsoner.
        </p>

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          disabled={busy}
          onClick={() => void handleGoogle()}
        >
          Fortsæt med Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          eller
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
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
            <Label htmlFor="password">Adgangskode</Label>
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
            {mode === "login" ? "Log ind" : "Opret konto"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Har du ikke en konto? Opret en" : "Har du en konto? Log ind"}
        </button>
      </div>
    </div>
  );
}
