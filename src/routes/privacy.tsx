import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Career Chronicles" },
      {
        name: "description",
        content:
          "How Career Chronicles collects, uses and protects your account data, squad screenshots and career data.",
      },
      { property: "og:title", content: "Privacy Policy — Career Chronicles" },
      {
        property: "og:description",
        content:
          "What data Career Chronicles collects, how it is used, and your rights under GDPR.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="landing-dark flex min-h-screen flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-lg font-semibold tracking-tight">
            Career Chronicles
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 22 September 2026</p>

        <div className="mt-8 space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Career Chronicles ("we", "us") is an independent companion app for EA Sports FC
              Career Mode. This policy explains what data we collect and why.
            </p>
          </div>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">What we collect</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Account data: your email address, used for login and account recovery.</li>
              <li>
                Squad screenshots you upload: processed by AI to extract player data (name,
                position, overall, age, value, wage, contract). You review and confirm this data
                before it is saved.
              </li>
              <li>Career data you enter or confirm: players, seasons, tactics, transfers.</li>
              <li>Basic usage data needed to operate the app.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">How we use it</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              To provide the app's core function: turning your screenshots into an organized,
              historical record of your career. We do not sell your data or use it for advertising.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Third parties</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              <li>Supabase: hosts our database, authentication and file storage.</li>
              <li>
                An AI provider processes uploaded screenshots to extract data. We aim to delete the
                original screenshot once extraction is confirmed, keeping only the structured data
                you approved.
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Your rights (GDPR)</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You can request access to, correction of, or deletion of your data at any time by
              contacting us at{" "}
              <a className="text-foreground underline" href="mailto:careerchronicl3s@gmail.com">
                careerchronicl3s@gmail.com
              </a>
              . You can also delete your account and data directly from the app's settings.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Data retention</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We keep your account data as long as your account is active. You can request full
              deletion at any time.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <a className="text-foreground underline" href="mailto:careerchronicl3s@gmail.com">
                careerchronicl3s@gmail.com
              </a>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This policy may be updated as the product evolves. We will note the date of the
              latest change above.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
