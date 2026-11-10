# TalentFlow ATS — Development Log

Engineering record for reviewers and collaborators. Each entry separates what was implemented, what evidence exists, and what is not yet verified.

---

## 2026-11-03

### Implemented

- Backend on Lovable-managed Supabase: `profiles`, `user_roles` (roles kept separate from profiles), `jobs`, `candidates`, with RLS scoping rows to the owning customer or any admin.
- Admin-only account creation; public sign-up disabled; one-time first-admin bootstrap.
- Customer login, job posting/deletion, candidate profiles (contact, LinkedIn, notes, pasted CV text).
- Six-stage drag-and-drop Kanban board with job and name filters.
- Admin "act as customer" selector.
- AI assessment of pasted CV text against the job description (0–100 score plus summary) via Lovable AI Gateway.
- Rebrand from the working name to TalentFlow; app published to a public URL; GitHub sync connected and repo made public.

### Tested / evidence

- Commit `2e12ce7` ("Added duplicate prevention") adds the fixes below and the test files.
- 14 Vitest test cases in four files (`stages`, `accounts-logic`, `candidate-dialog`, `app-routing`) were reported passing. Most use mocked backend clients and in-memory data.
- An earlier scripted browser run of the main flow was reported passing against the preview; its test accounts were then deleted. It was not repeated after the fixes.

### Problems and decisions

- **External Supabase connection:** the initial OAuth connection to a self-owned Supabase organization failed repeatedly for unclear reasons. Root cause not established. Decision: move to Lovable-managed Supabase to prioritise a working product before the Nov 10 deadline.
- **Static code review findings,** then fixed by Lovable:
  - duplicate candidate rows when a new candidate was assessed, then saved or re-assessed;
  - stale AI score/summary after changing CV text or job;
  - race condition in first-admin bootstrap (now guarded by a single-row lock);
  - possible partially-created auth users when the role insert failed (now rolled back).
- Job editing does not exist, so a job description cannot change under an existing score. This is a current limitation, not a fix.

### AI-assisted workflow and personal review limits

ChatGPT and Lovable generated most of the code, planning and code-based QA. The developer directed scope, weighed tradeoffs, reviewed prompts and outputs, skimmed generated source, read up on stack features and recorded reasoning. The developer does not claim a deep manual audit of all source or authorship of the generated code.

Implementation was fast; verification is the slower, separate step. Code-based and mocked-test verification is not the same as independent QA against the real backend and browser. This log keeps those apart so a handoff reflects what is actually known.

### Known risks / not yet verified

- Tenant isolation (RLS) not confirmed with real, separate customer accounts.
- Persistence and full flows not re-verified end-to-end after the fixes.
- Published app not independently validated beyond loading.
- AI score quality only spot-checked with a minimal CV.

### Next steps

- Manual end-to-end QA.
- Confirm authorization/RLS and persistence using fictional accounts in a safe, isolated setup.
- Verify public reviewer access to app and repo.
- Prepare the five-minute demo and the assumptions email (not yet sent).
- Optional idea, not required or started: try a Cursor + Codex workflow for comparison.

---

## 2026-11-09

This update supersedes the 2026-11-03 status for manual QA. The 2026-11-03 entry above is kept as a historical record.

### Manual checks / evidence

Performed by the developer by hand against the published app. These are targeted checks, separate from the automated tests, and not full end-to-end coverage.

- A reviewer admin account signed in to production successfully (credentials not recorded here).
- Admin selected a customer workspace (BrightPlot) via "act as customer".
- Created a job; it appeared in the Jobs list.
- Edited a synthetic (fictional) candidate.
- Moved a candidate between Kanban stages; the new stage persisted after a page refresh.
- Ran the AI CV assessment; in one check the score and written rationale were saved and persisted after refresh.
- Lovable reported 14 passing Vitest unit/component tests. Most use mocks; they are not integration evidence.

### Small fix

- Job cards on the Jobs page truncated descriptions with CSS `line-clamp-3`. Changed to full-text rendering with `whitespace-pre-wrap` (keeps line breaks). The developer then confirmed the full text appears in the published app.
- Job editing is still not supported.

### AI assessment observations

- With identical input, repeated assessments gave varying numerical scores, sometimes by a large margin. No repeatability is guaranteed.
- Treat scores as exploratory decision support only, not an objectively reliable hiring signal.

### Remaining limitations

- Cross-customer/tenant isolation (RLS) not verified with separate customer accounts.
- Broader authorization, security and integration robustness not independently verified.
- Not claimed to be production-ready.
- Demo upload and assignment submission are still pending confirmation.

---

## 2026-11-10 — Submission status

The TalentFlow coding-test submission email was sent to Jonas Karles on 2026-11-09 at approximately 22:58 CET, with the published app URL, public repository, Loom demo video, and reviewer-admin login details. This supersedes the Nov 9 entry's previously pending demo/submission status. No additional application functionality or independent tenant-isolation/security verification is claimed.

- Demo video (Loom): https://www.loom.com/share/b5b2350392c2443dadc472054df040b8
- Video playback was not independently verified from this environment.
