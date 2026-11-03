export const STAGES = [
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "hired", label: "Hired" },
  { id: "rejected", label: "Rejected" },
] as const;

export type Stage = (typeof STAGES)[number]["id"];

export function isStage(v: unknown): v is Stage {
  return STAGES.some((s) => s.id === v);
}

export type CandidateLite = { full_name: string; job_id: string; stage: Stage };

/** Filter used by the kanban board: by job (or "all") and by case-insensitive name substring. */
export function filterCandidates<T extends CandidateLite>(list: T[], jobId: string, query: string): T[] {
  const q = query.trim().toLowerCase();
  return list.filter(
    (c) => (jobId === "all" || c.job_id === jobId) && (!q || c.full_name.toLowerCase().includes(q)),
  );
}

export function clampScore(n: unknown): number | null {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}
