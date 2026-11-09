import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useJobs } from "@/hooks/use-jobs";
import { NeedCustomer, useWorkspace } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/jobs")({
  head: () => ({
    meta: [
      { title: "Jobs — TalentFlow" },
      { name: "description", content: "Post the jobs you are recruiting for." },
      { property: "og:title", content: "Jobs — TalentFlow" },
      { property: "og:description", content: "Post the jobs you are recruiting for." },
    ],
  }),
  component: JobsPage,
});

function JobsPage() {
  const { customerId } = useWorkspace();
  const qc = useQueryClient();
  const { data: jobs } = useJobs(customerId);
  const [form, setForm] = useState({ title: "", location: "", description: "" });

  if (!customerId) return <NeedCustomer />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("jobs").insert({ ...form, customer_id: customerId! });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Job posted");
    setForm({ title: "", location: "", description: "" });
    qc.invalidateQueries({ queryKey: ["jobs", customerId] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this job and all its candidates?")) return;
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["jobs", customerId] });
    qc.invalidateQueries({ queryKey: ["candidates", customerId] });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-md border bg-card p-5">
        <h2 className="font-display text-2xl">Post a job</h2>
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Location</Label>
          <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Description & requirements</Label>
          <Textarea
            rows={6}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Used by the AI when assessing CVs"
          />
        </div>
        <Button type="submit" className="w-full">
          Post job
        </Button>
      </form>
      <div>
        <h2 className="mb-3 font-display text-2xl">Open jobs</h2>
        {!jobs?.length && <p className="text-muted-foreground">No jobs yet.</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {(jobs ?? []).map((j) => (
            <div key={j.id} className="rounded-md border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-display text-lg">{j.title}</div>
                  {j.location && <div className="text-sm text-muted-foreground">{j.location}</div>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => remove(j.id)}>
                  Delete
                </Button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{j.description}</p>
              <Link to="/board" search={{ job: j.id }} className="mt-3 inline-block text-sm text-accent underline">
                {(j.candidates as { count: number }[])[0]?.count ?? 0} candidates → board
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
