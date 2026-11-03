import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { clampScore } from "@/lib/stages";

const accountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1).max(120),
  company_name: z.string().max(120).optional().default(""),
  role: z.enum(["admin", "customer"]),
});

async function createUserWithRole(input: z.infer<typeof accountSchema>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, company_name: input.company_name },
  });
  if (error || !data.user) throw new Error(error?.message ?? "Could not create user");
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: data.user.id, role: input.role });
  if (roleErr) throw new Error(roleErr.message);
  return { id: data.user.id };
}

/** Admin-only: create an admin or customer account. */
export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can create accounts");
    return createUserWithRole(data);
  });

/** Public, one-time: creates the very first admin. Refuses once any admin exists. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accountSchema.omit({ role: true }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An admin already exists");
    return createUserWithRole({ ...data, role: "admin" });
  });

/** AI assessment of a candidate's CV against the job description. */
export const evaluateCandidate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ candidateId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cand, error } = await supabase
      .from("candidates")
      .select("id, full_name, cv_text, notes, linkedin_url, jobs(title, description)")
      .eq("id", data.candidateId)
      .single();
    if (error || !cand) throw new Error("Candidate not found");
    if (!cand.cv_text?.trim()) throw new Error("Paste the candidate's CV text first");
    const job = cand.jobs as { title: string; description: string } | null;

    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    let text = "";
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          "You are an experienced recruiter. Assess how well the candidate's CV matches the job. Be fair, concise and specific. Ignore age, gender, ethnicity, and other protected characteristics.",
        input: [
          {
            role: "user",
            content: `Return JSON with keys "score" (integer 0-100) and "summary" (max 80 words: strengths, gaps, recommendation).\n\nJOB: ${job?.title ?? ""}\n${job?.description ?? ""}\n\nCANDIDATE: ${cand.full_name}\nCV:\n${cand.cv_text.slice(0, 15000)}`,
          },
        ],
        text: { format: { type: "json_object" } },
      });
      const r = res as unknown as {
        output_text?: string;
        output?: { content?: { type: string; text?: string }[] }[];
      };
      text =
        r.output_text ??
        (r.output ?? [])
          .flatMap((o) => o.content ?? [])
          .filter((c) => c.type === "output_text")
          .map((c) => c.text ?? "")
          .join("");
    } catch (e) {
      if (e instanceof GatewayError) throw new Error("AI assessment is unavailable right now, please try later");
      throw e;
    }
    let parsed: { score?: unknown; summary?: unknown } = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("AI returned an unreadable answer, please try again");
    }
    const score = clampScore(parsed.score);
    const summary = String(parsed.summary ?? "").slice(0, 1000);
    const { error: upErr } = await supabase
      .from("candidates")
      .update({ ai_score: score, ai_summary: summary, ai_evaluated_at: new Date().toISOString() })
      .eq("id", cand.id);
    if (upErr) throw new Error(upErr.message);
    return { score, summary };
  });
