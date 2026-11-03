import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createAccount } from "@/lib/ats.functions";
import { useWorkspace } from "./route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Accounts — Shortlist" },
      { name: "description", content: "Create and manage admin and customer accounts." },
      { property: "og:title", content: "Accounts — Shortlist" },
      { property: "og:description", content: "Create and manage admin and customer accounts." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin } = useWorkspace();
  const qc = useQueryClient();
  const create = useServerFn(createAccount);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    company_name: "",
    role: "customer" as "admin" | "customer",
  });
  const [busy, setBusy] = useState(false);

  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      return (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  if (!isAdmin) return <p className="text-muted-foreground">Only admins can manage accounts.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ data: form });
      toast.success(`Account created for ${form.email}`);
      setForm({ email: "", password: "", full_name: "", company_name: "", role: "customer" });
      qc.invalidateQueries({ queryKey: ["accounts"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="font-display text-2xl">New account</h2>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "admin" | "customer" })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="Full name" value={form.full_name} onChange={set("full_name")} required />
        {form.role === "customer" && (
          <Field label="Company" value={form.company_name} onChange={set("company_name")} required />
        )}
        <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
        <Field label="Temporary password (min 8)" value={form.password} onChange={set("password")} required minLength={8} />
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </Button>
        <p className="text-xs text-muted-foreground">Share the email and password with the person directly.</p>
      </form>
      <div>
        <h2 className="mb-3 font-display text-2xl">All accounts</h2>
        <div className="divide-y rounded-md border bg-card">
          {(accounts ?? []).map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{a.company_name || a.full_name || a.email}</div>
                <div className="truncate text-sm text-muted-foreground">
                  {a.full_name} · {a.email}
                </div>
              </div>
              {a.roles.map((r) => (
                <Badge key={r} variant={r === "admin" ? "default" : "secondary"}>
                  {r}
                </Badge>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}
