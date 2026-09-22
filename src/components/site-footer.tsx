import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p>
            <span className="font-display font-semibold text-foreground">Career Chronicles</span>
            <span className="ml-2">© {year}</span>
          </p>
          <p className="text-xs">Not affiliated with EA Sports FC</p>
        </div>
        <nav className="flex flex-wrap items-center gap-4">
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <a href="mailto:careerchronicl3s@gmail.com" className="hover:text-foreground">
            careerchronicl3s@gmail.com
          </a>
        </nav>
      </div>
    </footer>
  );
}
