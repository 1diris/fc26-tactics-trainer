import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  staticData: { sitemap: "exclude-subtree" },
  head: () => ({
    meta: [
      { title: "Account — Career Chronicles" },
      { name: "description", content: "Access your saved Career Mode careers, squads, tactics and challenges." },
      { property: "og:title", content: "Account — Career Chronicles" },
      { property: "og:description", content: "Your Career Mode workspace in Career Chronicles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  // A skeleton instead of a blank screen while the session is checked.
  pendingMs: 200,
  pendingComponent: () => (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-muted/70" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted/50" />
      </div>
    </div>
  ),
  component: () => <Outlet />,
});
