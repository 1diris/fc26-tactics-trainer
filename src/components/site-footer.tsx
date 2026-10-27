import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Career Chronicles · Not affiliated with EA Sports FC.</p>
        <nav className="flex flex-wrap items-center gap-5">
          <Link to="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <a
            href="mailto:careerchronicl3s@gmail.com"
            className="transition-colors hover:text-foreground"
          >
            careerchronicl3s@gmail.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
