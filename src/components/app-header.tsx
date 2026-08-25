import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";

export function AppHeader({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  return (
    <header className="border-b border-border/60 bg-card/40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-5 py-3">
        <Link to="/karrierer" className="font-display text-sm font-semibold tracking-tight">
          Career Chronicles
        </Link>
        <div className="flex-1">{children}</div>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" /> Log ud
        </Button>
      </div>
    </header>
  );
}
