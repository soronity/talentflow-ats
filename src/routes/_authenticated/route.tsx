import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WorkspaceCtx } from "@/lib/workspace";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers, useMe } from "@/hooks/use-me";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});


function Shell() {
  const { data: me, isLoading } = useMe();
  const { data: customers } = useCustomers(!!me?.isAdmin);
  const [picked, setPicked] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!me?.isAdmin) return;
    const saved = localStorage.getItem("ats.customer");
    if (saved) setPicked(saved);
  }, [me?.isAdmin]);

  const customerId = me?.isAdmin ? (customers?.some((c) => c.id === picked) ? picked : null) : (me?.id ?? null);

  if (isLoading || !me) return <div className="p-10 text-muted-foreground">Loading…</div>;

  return (
    <WorkspaceCtx.Provider value={{ customerId, isAdmin: me.isAdmin }}>
      <div className="min-h-screen">
        <header className="border-b bg-card">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 py-3">
            <Link to="/board" className="font-display text-2xl font-semibold">
              TalentFlow<span className="text-accent">.</span>
            </Link>
            <nav className="flex gap-1 text-sm">
              <NavLink to="/board">Board</NavLink>
              <NavLink to="/jobs">Jobs</NavLink>
              {me.isAdmin && <NavLink to="/admin">Accounts</NavLink>}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              {me.isAdmin && (
                <Select
                  value={customerId ?? ""}
                  onValueChange={(v) => {
                    setPicked(v);
                    localStorage.setItem("ats.customer", v);
                  }}
                >
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Act as customer…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.company_name || c.full_name || c.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <span className="hidden text-sm text-muted-foreground md:inline">
                {me.email} {me.isAdmin && "· admin"}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/auth" });
                }}
              >
                Sign out
              </Button>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-6 py-6">
          <Outlet />
        </main>
      </div>
    </WorkspaceCtx.Provider>
  );
}

function NavLink({ to, children }: { to: "/board" | "/jobs" | "/admin"; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded px-3 py-1.5 text-muted-foreground hover:text-foreground"
      activeProps={{ className: "rounded px-3 py-1.5 bg-secondary text-foreground font-medium" }}
    >
      {children}
    </Link>
  );
}
