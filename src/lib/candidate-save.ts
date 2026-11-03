export type CandidateForm = {
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  notes: string;
  cv_text: string;
  job_id: string;
};

/** An AI score only describes the CV + job it was computed for; changing either makes it stale. */
export function aiResetFields(
  prev: { cv_text: string | null; job_id: string } | null,
  next: { cv_text: string; job_id: string },
): { ai_score: null; ai_summary: null; ai_evaluated_at: null } | Record<string, never> {
  if (!prev) return {};
  if ((prev.cv_text ?? "") !== next.cv_text || prev.job_id !== next.job_id) {
    return { ai_score: null, ai_summary: null, ai_evaluated_at: null };
  }
  return {};
}
