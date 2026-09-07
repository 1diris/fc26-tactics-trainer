import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
    text: "Upload et screenshot af trupskærmen. AI læser navn, position, OVR, potentiale, alder, værdi, løn og kontrakt.",
  },
  {
    icon: Users,
    title: "Trupoversigt",
    text: "Sortér og filtrér hele truppen på position, alder, potentiale og værdi — langt hurtigere end i spillet.",
  },
  {
    icon: LineChart,
    title: "Udvikling over sæsoner",
    text: "Hver upload bliver et snapshot, så du kan se hvem der vokser, og hvem der stagnerer.",
  },
  {
    icon: ShieldAlert,
    title: "Advarsler",
    text: "Manglende positioner, ingen backup og kontrakter der udløber bliver fremhævet automatisk.",
  },
];

function Landing() {
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-display text-lg font-semibold tracking-tight">
            Career Chronicles
          </span>
          <Button asChild size="sm" variant={signedIn ? "default" : "outline"}>
            <Link to={signedIn ? "/karrierer" : "/auth"}>
              {signedIn ? "Mine karrierer" : "Log ind"}
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="py-16 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Til FC 26 Career Mode
          </p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Dit eksterne managementværktøj til karrieren
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Tag et screenshot af din trup, upload det, og få hele holdet ind i en database du kan
            analysere sæson efter sæson. Ingen manuel indtastning, ingen regneark.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={signedIn ? "/karrierer" : "/auth"}>Kom i gang</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border/60 bg-card p-6 shadow-sm"
            >
              <feature.icon className="h-5 w-5 text-primary" aria-hidden />
              <h2 className="mt-4 font-display text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
