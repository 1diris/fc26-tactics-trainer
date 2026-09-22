import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Career Chronicles" },
      {
        name: "description",
        content:
          "The terms for using Career Chronicles, an independent companion tool for EA Sports FC Career Mode.",
      },
      { property: "og:title", content: "Terms of Service — Career Chronicles" },
      {
        property: "og:description",
        content:
          "Account rules, your content, acceptable use and liability for Career Chronicles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 22 September 2026</p>

        <div className="mt-8 space-y-4">
          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">
              What Career Chronicles is
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Career Chronicles is an independent, unofficial companion tool for EA Sports FC
              Career Mode. We are not affiliated with, endorsed by, or connected to EA Sports,
              Electronic Arts, or any of their brands, trademarks or licensed content.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Your account</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You are responsible for keeping your login credentials secure. You must be at least
              16 years old to create an account (in line with GDPR's minimum age for consent
              without parental approval).
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Your content</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              You own the data and screenshots you upload. By uploading a screenshot, you confirm
              you have the right to do so, and you give us permission to process it solely to
              extract and store the data you approve.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Acceptable use</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Don't use the app to upload content you don't have rights to, attempt to disrupt the
              service, or misuse the AI extraction feature outside its intended purpose.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">No warranty</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The app is provided "as is". AI-extracted data may contain errors — always review it
              before confirming. We are not liable for decisions made based on data in the app.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">
              Changes and termination
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We may update these terms or the app over time. You can delete your account at any
              time. We may suspend accounts that violate these terms.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Governing law</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              These terms are governed by Danish law.
            </p>
          </section>

          <section className="rounded-xl border border-border/60 bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">Contact</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              <a className="text-foreground underline" href="mailto:careerchronicl3s@gmail.com">
                careerchronicl3s@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
