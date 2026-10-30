import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, LogOut, Trophy } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

type Me = { name: string; email: string };

function ActivePill({ count }: { count: number }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: "rgba(34,197,94,0.14)", color: "#22c55e" }}
    >
      {count} active
    </span>
  );
}

export function AppHeader({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u || cancelled) return;
      const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
      const name = (meta["full_name"] as string) || (meta["name"] as string) || (u.email?.split("@")[0] ?? "Player");
      setMe({ name, email: u.email ?? "" });
      const { count } = await supabase
        .from("challenge_progress")
        .select("challenge_id", { count: "exact", head: true })
        .eq("user_id", u.id);
      if (!cancelled) setActive(count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (window.innerWidth >= 768 && wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const signOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  const initial = (me?.name ?? "?").charAt(0).toUpperCase();
  const avatar = (
    <span
      className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
      style={{ background: "#1f1f23", color: "#fafafa" }}
    >
      {initial}
    </span>
  );

  return (
    <header
      className="relative z-40"
      style={{ background: "#09090b", borderBottom: "1px solid #1f1f23", paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-[60px] max-w-6xl flex-nowrap items-center gap-3 px-4 md:h-16 md:px-5">
        <Link to="/karrierer" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <BrandLogo size={28} className="h-7 w-7 shrink-0" />
          <span
            className="truncate text-[19px] font-bold uppercase leading-none md:text-[21px]"
            style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: "0.04em", color: "#fafafa" }}
          >
            Career Chronicles
          </span>
        </Link>
        <div className="min-w-0 flex-1">{children}</div>

        {/* Desktop */}
        <div className="hidden shrink-0 items-center gap-4 md:flex">
          <Link to="/challenges" className="flex items-center gap-2 text-sm font-medium" style={{ color: "#fafafa" }}>
            <Trophy className="h-4 w-4" style={{ color: "#22c55e" }} />
            Challenges
            {active > 0 && <ActivePill count={active} />}
          </Link>
          <span className="h-6 w-px" style={{ background: "#27272a" }} />
          <div ref={wrapRef} className="relative">
            <button
              type="button"
              aria-label="Account"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 rounded-full p-0.5 pr-2"
              style={{ border: "1px solid #27272a", color: "#a1a1aa" }}
            >
              {avatar}
              <ChevronDown className="h-4 w-4" />
            </button>
            {open && (
              <div
                className="absolute right-0 top-full mt-2 w-[260px] overflow-hidden p-1.5 shadow-2xl"
                style={{ background: "#111113", border: "1px solid #27272a", borderRadius: 14 }}
              >
                <div className="px-3 py-2.5">
                  <div className="truncate text-sm font-semibold" style={{ color: "#fafafa" }}>{me?.name}</div>
                  <div className="truncate text-xs" style={{ color: "#a1a1aa" }}>{me?.email}</div>
                </div>
                <div className="my-1 h-px" style={{ background: "#27272a" }} />
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm hover:bg-white/5"
                  style={{ color: "#fafafa" }}
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <Link to="/challenges" aria-label="Challenges" className="relative flex h-11 w-11 items-center justify-center rounded-full">
            <Trophy className="h-5 w-5" style={{ color: "#22c55e" }} />
            {active > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full" style={{ background: "#22c55e", boxShadow: "0 0 0 2px #09090b" }} />
            )}
          </Link>
          <button
            type="button"
            aria-label="Account"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 w-11 items-center justify-center rounded-full"
          >
            <span className="rounded-full" style={{ border: "1px solid #27272a" }}>{avatar}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden">
          <div className="fixed inset-0 top-0 z-[-1] bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 top-full p-2" style={{ background: "#111113", borderBottom: "1px solid #27272a" }}>
            <div className="px-3 py-3">
              <div className="truncate text-sm font-semibold" style={{ color: "#fafafa" }}>{me?.name}</div>
              <div className="truncate text-xs" style={{ color: "#a1a1aa" }}>{me?.email}</div>
            </div>
            <div className="my-1 h-px" style={{ background: "#27272a" }} />
            <Link
              to="/challenges"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2.5 rounded-lg px-3 text-sm"
              style={{ color: "#fafafa" }}
            >
              <Trophy className="h-4 w-4" style={{ color: "#22c55e" }} /> Challenges
              {active > 0 && <ActivePill count={active} />}
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm"
              style={{ color: "#fafafa" }}
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
