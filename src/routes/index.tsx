import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowUp } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";

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

const primaryBtn =
  "inline-flex h-[52px] items-center justify-center rounded-xl bg-primary px-7 text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90";
const secondaryBtn =
  "inline-flex h-[52px] items-center justify-center rounded-xl border border-[var(--landing-border-strong)] px-7 text-[15px] font-medium text-foreground transition-colors hover:bg-card";

const rows = [
  { pos: "ST", ovr: 84, pot: 90, value: "€92m", high: true },
  { pos: "CM", ovr: 81, pot: 87, value: "€64m", high: true },
  { pos: "CB", ovr: 79, pot: 82, value: "€38m", high: false },
  { pos: "GK", ovr: 80, pot: 81, value: "€22m", high: false },
];

function scrollToHow(e: React.MouseEvent) {
  e.preventDefault();
  document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
}

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

  const startTo = signedIn ? "/karrierer" : "/auth";

  return (
    <div className="landing-dark min-h-screen">
      <header>
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            <span className="font-tight text-[20px] font-bold">Career Chronicles</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a
              href="#how"
              onClick={scrollToHow}
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              How it works
            </a>
            <Link
              to={startTo}
              className="hidden text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              {signedIn ? "My careers" : "Log in"}
            </Link>
            <Link
              to={startTo}
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5">
        {/* Hero */}
        <section className="flex flex-col items-center pt-20 text-center sm:pt-28">
          <span className="rounded-full border border-border px-3.5 py-1.5 text-xs text-muted-foreground">
            For EA Sports FC Career Mode
          </span>
          <h1 className="font-tight mt-8 text-[52px] font-bold leading-[0.95] sm:text-[96px]">
            Manage your career.
            <br />
            <span className="text-primary">Outside the game.</span>
          </h1>
          <p className="mt-8 text-[19px] text-muted-foreground">
            Upload a squad screenshot. We handle the rest.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to={startTo} className={primaryBtn}>
              Get started
            </Link>
            <a href="#how" onClick={scrollToHow} className={secondaryBtn}>
              How it works
            </a>
          </div>
        </section>

        {/* App preview */}
        <section className="mx-auto mt-24 max-w-[1000px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-5">
              <span className="font-tight text-lg font-semibold">Squad</span>
              <span className="text-right text-xs text-muted-foreground">
                Season 2025/26 · Imported from screenshot
              </span>
            </div>
            <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
              {[
                { label: "Players", value: "24" },
                { label: "Season", value: "25/26" },
                { label: "Squad value", value: "€647m", accent: true },
              ].map((s) => (
                <div key={s.label} className="px-4 py-6 sm:px-6">
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div
                    className={`font-tight mt-1 text-[28px] font-semibold sm:text-[40px] ${s.accent ? "text-primary" : ""}`}
                  >
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--landing-divider)] text-left text-xs text-muted-foreground">
                    <th className="py-4 font-normal">Player</th>
                    <th className="py-4 font-normal">Pos</th>
                    <th className="py-4 font-normal">OVR</th>
                    <th className="hidden py-4 font-normal sm:table-cell">POT</th>
                    <th className="hidden py-4 font-normal sm:table-cell">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      className="border-b border-[var(--landing-divider)] last:border-0"
                    >
                      <td className="py-4 font-medium">[Player name]</td>
                      <td className="py-4 text-muted-foreground">{r.pos}</td>
                      <td className="py-4 font-medium">{r.ovr}</td>
                      <td
                        className={`hidden py-4 sm:table-cell ${r.high ? "text-primary" : "font-medium"}`}
                      >
                        {r.pot}
                      </td>
                      <td className="hidden py-4 text-muted-foreground sm:table-cell">
                        {r.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-10 pt-40">
          <div className="text-sm font-medium text-primary">How it works</div>
          <h2 className="font-tight mt-4 text-[40px] font-bold leading-[1] sm:text-[60px]">
            From screenshot to squad.
            <br />
            <span className="text-muted-foreground">In five steps.</span>
          </h2>
          <div className="mt-16 grid gap-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {steps.map((s, i) => (
              <div key={s.title}>
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  {i < steps.length - 1 && (
                    <span className="hidden h-px flex-1 bg-border lg:block" aria-hidden />
                  )}
                </div>
                <div className="relative mt-5 h-[150px] overflow-hidden rounded-[14px] border border-border bg-card">
                  {s.illo}
                </div>
                <h3 className="font-tight mt-5 text-[20px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center py-40 text-center">
          <h2 className="font-tight text-[44px] font-bold leading-[0.95] sm:text-[72px]">
            Your next season
            <br />
            <span className="text-primary">starts here.</span>
          </h2>
          <Link to={startTo} className={`${primaryBtn} mt-10`}>
            Get started
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Bar({ w, className = "" }: { w: string; className?: string }) {
  return <span className={`block h-1.5 rounded-full bg-border ${className}`} style={{ width: w }} />;
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-border bg-card px-2 py-1 text-[10px] text-muted-foreground">
      {children}
    </span>
  );
}

const corner = "absolute h-4 w-4 border-primary";

const steps: { title: string; text: string; illo: ReactNode }[] = [
  {
    title: "Screenshot",
    text: "Take a screenshot of your squad screen in Career Mode.",
    illo: (
      <div className="absolute inset-3">
        <span className={`${corner} left-0 top-0 border-l-2 border-t-2`} />
        <span className={`${corner} right-0 top-0 border-r-2 border-t-2`} />
        <span className={`${corner} bottom-0 left-0 border-b-2 border-l-2`} />
        <span className={`${corner} bottom-0 right-0 border-b-2 border-r-2`} />
        <div className="absolute inset-3 space-y-2 rounded bg-[var(--landing-divider)] p-3">
          <Bar w="45%" />
          <Bar w="80%" />
          <Bar w="70%" />
          <Bar w="85%" />
        </div>
      </div>
    ),
  },
  {
    title: "Upload",
    text: "Drop the image into Career Chronicles.",
    illo: (
      <div className="absolute inset-3 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--landing-border-strong)]">
        <ArrowUp className="h-5 w-5 text-primary" aria-hidden />
        <span className="rounded-md bg-[var(--landing-border-strong)] px-2 py-1 text-[10px] text-foreground">
          squad.png
        </span>
      </div>
    ),
  },
  {
    title: "AI reads it",
    text: "Name, position, OVR, POT, age, value, wage and contract.",
    illo: (
      <div className="absolute inset-3 flex flex-wrap content-center gap-2">
        <Chip>Name</Chip>
        <Chip>
          Pos <span className="text-foreground">ST</span>
        </Chip>
        <Chip>
          OVR <span className="text-foreground">84</span>
        </Chip>
        <Chip>
          POT <span className="text-primary">90</span>
        </Chip>
        <Chip>
          Age <span className="text-foreground">21</span>
        </Chip>
        <span className="absolute inset-x-[-12px] top-1/2 h-px bg-primary" aria-hidden />
      </div>
    ),
  },
  {
    title: "Squad ready",
    text: "Your whole squad, sorted and filterable.",
    illo: (
      <div className="absolute inset-4 text-[10px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Player</span>
          <span>OVR</span>
        </div>
        {[
          ["70%", "84", true],
          ["55%", "81", false],
          ["62%", "79", false],
        ].map(([w, n, top]) => (
          <div
            key={n as string}
            className="mt-2 flex items-center justify-between border-t border-[var(--landing-divider)] pt-2"
          >
            <Bar w={w as string} />
            <span className={top ? "text-primary" : "text-foreground"}>{n}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Track & act",
    text: "Follow growth each season and get alerts on gaps.",
    illo: (
      <div className="absolute inset-4">
        <svg viewBox="0 0 120 50" className="h-16 w-full" aria-hidden>
          <polyline
            points="5,45 30,40 50,34 75,22 100,14 115,9"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="1.5"
          />
          <circle cx="115" cy="9" r="2.5" fill="var(--primary)" />
        </svg>
        <div className="mt-4 flex items-center gap-2 border-t border-[var(--landing-divider)] pt-3 text-[10px] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--landing-warning)]" />
          RB · Thin depth
        </div>
      </div>
    ),
  },
];
