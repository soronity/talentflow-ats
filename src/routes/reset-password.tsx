import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set a new password — TalentFlow" },
      { name: "description", content: "Choose a new password for your TalentFlow account." },
      { property: "og:title", content: "Set a new password — TalentFlow" },
      { property: "og:description", content: "Choose a new password for your TalentFlow account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/board" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-3xl">Set a new password</h1>
        {!ready ? (
          <p className="text-sm text-muted-foreground">
            Open this page from the reset link in your email. If the link has expired, request a new one from the sign-in page.
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : "Save new password"}
            </Button>
          </>
        )}
      </form>
    </div>
  );
}
