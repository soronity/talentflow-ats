import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin } from "@/lib/ats.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Shortlist" },
      { name: "description", content: "Sign in to your Shortlist applicant tracking account." },
      { property: "og:title", content: "Sign in — Shortlist" },
      { property: "og:description", content: "Sign in to your Shortlist applicant tracking account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { data: hasAdmin, refetch } = useQuery({
    queryKey: ["admin-exists"],
    queryFn: async () => {
      const { data } = await supabase.rpc("admin_exists");
      return !!data;
    },
  });
  const bootstrap = useServerFn(bootstrapAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const setup = hasAdmin === false;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (setup) {
        await bootstrap({ data: { email, password, full_name: name, company_name: "" } });
        await refetch();
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/board" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground md:flex">
        <div className="font-display text-3xl font-semibold">
          Shortlist<span className="text-accent">.</span>
        </div>
        <div>
          <p className="font-display text-5xl leading-tight">
            Every candidate,
            <br />
            one clear board.
          </p>
          <p className="mt-4 max-w-sm opacity-70">
            Post jobs, add candidates, move them through your pipeline — with an AI second opinion on every CV.
          </p>
        </div>
        <div className="text-sm opacity-50">Accounts are created by your administrator.</div>
      </div>
      <div className="flex items-center justify-center p-8">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h1 className="font-display text-3xl">{setup ? "Create the first admin" : "Sign in"}</h1>
          {setup && (
            <p className="text-sm text-muted-foreground">
              No admin exists yet. This one-time form creates the owner account; it disappears afterwards.
            </p>
          )}
          {setup && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={setup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Please wait…" : setup ? "Create admin & sign in" : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
