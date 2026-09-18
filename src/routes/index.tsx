import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { Camera, LineChart, ShieldAlert, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Career Chronicles — FC 26 Career Mode assistant" },
      {
        name: "description",
        content:
          "Upload screenshots from your FC 26 career, let AI read your squad automatically and keep track of growth, contracts and gaps in the squad.",
      },
      { property: "og:title", content: "Career Chronicles — FC 26 Career Mode assistant" },
      {
        property: "og:description",
        content:
          "Screenshots in, squad data out. Track player growth, contract expiry and weaknesses in your FC 26 career.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Camera,
    title: "Screenshot → data",
    text: "Upload a screenshot of the squad screen. AI reads name, position, OVR, POT, age, value, wage and contract.",
  },
  {
    icon: Users,
    title: "Squad overview",
    text: "Sort and filter your whole squad by position, age, POT and value — far faster than in the game.",
  },
  {
    icon: LineChart,
    title: "Growth across seasons",
    text: "Every upload becomes a snapshot, so you can see who is growing and who is stalling.",
  },
  {
    icon: ShieldAlert,
    title: "Alerts",
    text: "Missing positions, no backup and expiring contracts are highlighted automatically.",
  },
const [featured, gridFeatures] = [features[0], features.slice(1)] as const;
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="landing-dark min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-display text-lg font-semibold tracking-tight">
            Career Chronicles
          </span>
          <Button asChild size="sm" variant={signedIn ? "default" : "outline"}>
            <Link to={signedIn ? "/karrierer" : "/auth"}>
              {signedIn ? "My careers" : "Log in"}
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="py-16 sm:py-24">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <BrandLogo size={56} className="h-14 w-14" />
            <h1 className="mt-8 font-display text-5xl font-bold leading-tight tracking-tight text-primary sm:text-6xl">
              Manage your career.
              <br />
              Outside the game.
            </h1>
            <p className="mt-6 text-base text-muted-foreground sm:text-lg">
              Upload a squad screenshot. We handle the rest.
            </p>
            <p className="mt-4 text-sm">
              <span className="font-bold text-foreground">24</span>
              <span className="text-muted-foreground"> players imported</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-bold text-foreground">Season 2025/26</span>
              <span className="mx-2 text-muted-foreground">·</span>
              <span className="font-bold text-foreground">€647m</span>
              <span className="text-muted-foreground"> squad value</span>
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full px-10">
              <Link to={signedIn ? "/karrierer" : "/auth"}>Get started</Link>
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          {featured && (
            <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
              <featured.icon className="h-6 w-6 text-primary" aria-hidden />
              <h2 className="mt-4 font-display text-xl font-semibold text-primary">
                {featured.title}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {featured.text}
              </p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {gridFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border/60 bg-card p-6 shadow-sm"
              >
                <feature.icon className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="mt-4 font-display text-lg font-semibold text-primary">
                  {feature.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
