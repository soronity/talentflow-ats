# TalentFlow QA review (read-only findings + proposed fixes/tests)

Evidence comes from static reading of the code plus read-only `git` and ignore-rule checks. I ran no tests or app sessions, so nothing below is verified at runtime.

## 1. Duplicate candidates on new → Assess → Save/Re-assess — LIKELY BUG (high)
- `src/routes/_authenticated/board.tsx` `CandidateDialog.save()` (~L211-230) branches on the `candidate` prop. For a new candidate that prop stays `null` for the whole life of the dialog.
- `runAi()` (~L232-245) calls `save()`, which INSERTs and returns the new id. Nothing stores that id, so the dialog still treats the record as new.
- Clicking **Save** (L308-312) or **Re-assess** afterwards calls `save()` again and INSERTs a second row. No unique constraint prevents it (none is visible in the schema).
- Your test showed "0/100 … Re-assess" while the title still read "New candidate". That matches this path, but the extra rows have not been checked in the database.
- Fix: keep a `savedId` in state (`candidate?.id ?? null`), set it after the first insert, and send updates to `savedId` from then on.

## 2. Stale AI score/summary — CONFIRMED BY CODE (medium)
- When the CV text or the job changes, `save()` only updates the form fields. `ai_score`, `ai_summary` and `ai_evaluated_at` stay as they were, and the card keeps showing the old score.
- Fix: in `save()`, clear the three AI fields whenever `cv_text` or `job_id` differs from the stored values. Optionally show a "CV changed — re-assess" hint.
- A related gap: changing a job's description also leaves scores stale. Treat this as a known limitation, or compare `ai_evaluated_at` with the job's update time (the jobs table has no `updated_at` column today).

## 3. Server/account risks
- **bootstrapAdmin race (low/medium):** the function counts admins and then creates one, and nothing locks between the two steps. Two parallel calls before any admin exists could both create admins. Fix: a partial unique index `ON user_roles(role) WHERE role='admin'` would block a second admin for good, so use an atomic security-definer RPC or an advisory lock instead. Exposure is limited to the window before the first admin exists.
- **createUserWithRole partial failure (medium):** if the `user_roles` insert fails, the auth user (and its profile, created by trigger) stays behind with no role. That leaves an orphan account that can sign in but sees nothing, and its email cannot be reused. Fix: on `roleErr`, call `supabaseAdmin.auth.admin.deleteUser(id)` and then rethrow.
- **.env and Git:** `.gitignore` does not list `.env` (`git check-ignore` exit 1), and `git ls-files` shows `.env` is tracked. It holds only the project ID, URL and publishable key, which are public by design. Low risk, but note it before making the repo public. No server secrets are in it. Optional: add `.env` to `.gitignore` and untrack it. Lovable regenerates it, but confirm the build still works afterwards.

## 4. Proposed safe tests (mocks only, no real data)
- `src/test/candidate-dialog.test.tsx` (React Testing Library). Mock `@/integrations/supabase/client` with an in-memory array and mock `evaluateCandidate`. Tests:
  - new candidate → Assess → Save → exactly 1 insert and then updates (no second insert).
  - Assess → Re-assess → 1 insert in total.
  - edit CV on a scored candidate → Save → the update payload has `ai_score: null`, `ai_summary: null`.
  - change job → the same AI fields are cleared.
- `src/test/ats-functions.test.ts`: pull the handler logic into plain functions that take an injected admin client. Tests:
  - the role insert fails → `deleteUser` is called with the created id.
  - bootstrap is refused when the admin count is above 0.
- Keep the existing `stages.test.ts` (`clampScore` and filter cases). Runner: `bunx vitest run` (vitest 4 with jsdom, already configured).

## 5. Git state (read-only)
- Current branch: `edit/edt-f62b16d7-…` (a Lovable working branch, not necessarily the synced GitHub branch).
- Remotes: `origin` and `secondary`, both Lovable-internal hosts. No GitHub remote shows in this sandbox, so from here I can't confirm the GitHub sync target. Check the Git panel to confirm it.

## If approved
Apply the fixes in sections 1-3 (plus the optional `.env` ignore) and add the tests in section 4. Then run `bunx vitest run` and report the actual results.
