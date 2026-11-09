import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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

type Phase = "checking" | "ready" | "invalid" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error")) {
      setPhase("invalid");
      return;
    }
    const isRecovery = hash.get("type") === "recovery" || query.has("code");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPhase("ready");
    });
    // Fallback: if the SDK already consumed the recovery link before we subscribed.
    const t = setTimeout(async () => {
      const { data: d } = await supabase.auth.getSession();
      setPhase((p) => (p !== "checking" ? p : isRecovery && d.session ? "ready" : "invalid"));
    }, 1500);
    return () => {
      clearTimeout(t);
      data.subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setBusy(false);
      setError(error.message || "Could not update the password. Request a new reset link.");
      return;
    }
    await supabase.auth.signOut();
    setBusy(false);
    setPhase("done");
    toast.success("Password updated — sign in with your new password");
    setTimeout(() => navigate({ to: "/auth", replace: true }), 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-3xl">Set a new password</h1>
        {phase === "checking" && <p className="text-sm text-muted-foreground">Checking your reset link…</p>}
        {phase === "invalid" && (
          <>
            <p className="text-sm text-destructive" role="alert">
              This reset link is invalid or has expired. Request a new one from the sign-in page.
            </p>
            <Link to="/auth" className="text-sm underline underline-offset-4">Back to sign in</Link>
          </>
        )}
        {phase === "done" && (
          <p className="text-sm text-muted-foreground" role="status">
            Password updated. Taking you to sign in…
          </p>
        )}
        {phase === "ready" && (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Please wait…" : "Save new password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
