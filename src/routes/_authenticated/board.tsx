import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { evaluateCandidate } from "@/lib/ats.functions";
import { STAGES, filterCandidates, isStage, type Stage } from "@/lib/stages";
import { NeedCustomer, useWorkspace } from "@/lib/workspace";
import { useJobs } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Candidate = Tables<"candidates">;

export const Route = createFileRoute("/_authenticated/board")({
  validateSearch: (s: Record<string, unknown>): { job?: string } =>
    typeof s["job"] === "string" ? { job: s["job"] } : {},
  head: () => ({
    meta: [
      { title: "Pipeline — TalentFlow" },
      { name: "description", content: "Kanban board of candidates across your hiring stages." },
      { property: "og:title", content: "Pipeline — TalentFlow" },
      { property: "og:description", content: "Kanban board of candidates across your hiring stages." },
    ],
  }),
  component: BoardPage,
});

function BoardPage() {
  const { customerId } = useWorkspace();
  const { job = "all" } = Route.useSearch();
  const navigate = useNavigate({ from: "/board" });
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Candidate | "new" | null>(null);
  const { data: jobs } = useJobs(customerId);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const key = ["candidates", customerId];
  const { data: candidates } = useQuery({
    queryKey: key,
    enabled: !!customerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidates")
        .select("*")
        .eq("customer_id", customerId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const visible = useMemo(() => filterCandidates(candidates ?? [], job, query), [candidates, job, query]);
  const jobTitle = (id: string) => jobs?.find((j) => j.id === id)?.title ?? "";

  if (!customerId) return <NeedCustomer />;

  async function onDragEnd(e: DragEndEvent) {
    const stage = e.over?.id;
    const id = String(e.active.id);
    if (!isStage(stage)) return;
    const prev = qc.getQueryData<Candidate[]>(key);
    if (prev?.find((c) => c.id === id)?.stage === stage) return;
    qc.setQueryData<Candidate[]>(key, (old) => old?.map((c) => (c.id === id ? { ...c, stage } : c)));
    const { error } = await supabase.from("candidates").update({ stage }).eq("id", id);
    if (error) {
      qc.setQueryData(key, prev);
      toast.error("Could not move candidate");
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <h1 className="mr-auto font-display text-3xl">Pipeline</h1>
        <Select value={job} onValueChange={(v) => navigate({ search: v === "all" ? {} : { job: v } })}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All jobs</SelectItem>
            {(jobs ?? []).map((j) => (
              <SelectItem key={j.id} value={j.id}>
                {j.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="w-56"
          placeholder="Search candidate name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={() => setEditing("new")} disabled={!jobs?.length}>
          + Add candidate
        </Button>
      </div>
      {!jobs?.length && <p className="mb-4 text-muted-foreground">Post a job first, then add candidates to it.</p>}
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((s) => (
            <Column key={s.id} id={s.id} label={s.label} count={visible.filter((c) => c.stage === s.id).length}>
              {visible
                .filter((c) => c.stage === s.id)
                .map((c) => (
                  <Card key={c.id} c={c} jobTitle={job === "all" ? jobTitle(c.job_id) : ""} onOpen={() => setEditing(c)} />
                ))}
            </Column>
          ))}
        </div>
      </DndContext>
      {editing && (
        <CandidateDialog
          candidate={editing === "new" ? null : editing}
          defaultJob={job !== "all" ? job : jobs?.[0]?.id ?? ""}
          jobs={jobs ?? []}
          customerId={customerId}
          onClose={() => setEditing(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: key })}
        />
      )}
    </div>
  );
}

function Column({ id, label, count, children }: { id: Stage; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60vh] rounded-md border p-2 transition-colors ${isOver ? "bg-secondary" : "bg-muted/50"}`}
    >
      <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
        <span>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Card({ c, jobTitle, onOpen }: { c: Candidate; jobTitle: string; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={`cursor-grab rounded border bg-card px-2.5 py-2 text-sm shadow-sm ${isDragging ? "z-10 opacity-80 shadow-lg" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-medium">{c.full_name}</span>
        {c.ai_score != null && (
          <span className="shrink-0 rounded bg-accent px-1.5 text-xs font-semibold text-accent-foreground">{c.ai_score}</span>
        )}
      </div>
      {jobTitle && <div className="truncate text-xs text-muted-foreground">{jobTitle}</div>}
    </div>
  );
}

function CandidateDialog({
  candidate,
  defaultJob,
  jobs,
  customerId,
  onClose,
  onSaved,
}: {
  candidate: Candidate | null;
  defaultJob: string;
  jobs: { id: string; title: string }[];
  customerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const evaluate = useServerFn(evaluateCandidate);
  const [f, setF] = useState({
    full_name: candidate?.full_name ?? "",
    email: candidate?.email ?? "",
    phone: candidate?.phone ?? "",
    linkedin_url: candidate?.linkedin_url ?? "",
    notes: candidate?.notes ?? "",
    cv_text: candidate?.cv_text ?? "",
    job_id: candidate?.job_id ?? defaultJob,
  });
  const [ai, setAi] = useState({ score: candidate?.ai_score ?? null, summary: candidate?.ai_summary ?? null });
  const [busy, setBusy] = useState(false);
  // Once a new candidate is inserted, every later save updates that same row (prevents duplicates).
  const [savedId, setSavedId] = useState<string | null>(candidate?.id ?? null);
  // CV + job the current AI score was computed for.
  const [scoredFor, setScoredFor] = useState<{ cv_text: string | null; job_id: string } | null>(
    candidate ? { cv_text: candidate.cv_text, job_id: candidate.job_id } : null,
  );
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function save(): Promise<string | null> {
    if (!f.full_name.trim() || !f.job_id) {
      toast.error("Name and job are required");
      return null;
    }
    if (savedId) {
      const reset = aiResetFields(scoredFor, f);
      const { error } = await supabase.from("candidates").update({ ...f, ...reset }).eq("id", savedId);
      if (error) return toast.error(error.message), null;
      if ("ai_score" in reset) setAi({ score: null, summary: null });
      setScoredFor({ cv_text: f.cv_text, job_id: f.job_id });
      onSaved();
      return savedId;
    }
    const { data, error } = await supabase
      .from("candidates")
      .insert({ ...f, customer_id: customerId })
      .select("id")
      .single();
    if (error) return toast.error(error.message), null;
    setSavedId(data.id);
    setScoredFor({ cv_text: f.cv_text, job_id: f.job_id });
    onSaved();
    return data.id;
  }

  async function runAi() {
    setBusy(true);
    try {
      const id = await save();
      if (!id) return;
      const r = await evaluate({ data: { candidateId: id } });
      setAi(r);
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI assessment failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!candidate || !confirm("Delete this candidate?")) return;
    await supabase.from("candidates").delete().eq("id", candidate.id);
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{candidate ? candidate.full_name : "New candidate"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Job</Label>
            <Select value={f.job_id} onValueChange={(v) => setF({ ...f, job_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <F label="Full name" value={f.full_name} onChange={set("full_name")} />
          <F label="Email" value={f.email} onChange={set("email")} />
          <F label="Phone" value={f.phone} onChange={set("phone")} />
          <F label="LinkedIn URL" value={f.linkedin_url} onChange={set("linkedin_url")} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={2} value={f.notes} onChange={set("notes")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>CV (paste text)</Label>
            <Textarea rows={6} value={f.cv_text} onChange={set("cv_text")} placeholder="Paste the CV content here" />
          </div>
        </div>
        <div className="rounded-md border bg-muted/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold">
              AI assessment {ai.score != null && <span className="ml-1 text-accent">{ai.score}/100</span>}
            </div>
            <Button size="sm" variant="outline" onClick={runAi} disabled={busy || !f.cv_text.trim()}>
              {busy ? "Assessing…" : ai.score != null ? "Re-assess" : "Assess CV with AI"}
            </Button>
          </div>
          {ai.summary && <p className="mt-2 text-sm text-muted-foreground">{ai.summary}</p>}
        </div>
        <div className="flex justify-between">
          {candidate ? (
            <Button variant="ghost" onClick={remove}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={async () => {
              if (await save()) onClose();
            }}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, ...p }: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input {...p} />
    </div>
  );
}
