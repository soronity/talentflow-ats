# TalentFlow ATS

A mini applicant tracking system (ATS) built for the Devotion Ventures Entrepreneurial Programmer coding exercise.

**Development log:** see [DEVLOG.md](./DEVLOG.md) for what was built, tested and decided each day, including known gaps.

## Links

- Public app: https://talentflow-hiring-lane.lovable.app
- Repository: https://github.com/soronity/talentflow-ats
- Lovable editor: https://lovable.dev/projects/8c35bdbe-00be-4b6d-82c7-c6121059b31d
- Demo video (Loom): https://www.loom.com/share/b5b2350392c2443dadc472054df040b8

## Implemented functionality

- **Account provisioning:** admins create admin and customer accounts. Public sign-up is disabled. A one-time "create the first admin" form appears only while no admin exists.
- **Customer login:** email and password sign-in.
- **Jobs:** customers post (and delete) job openings with a description. Editing a job is not yet supported.
- **Candidate profiles:** name, email, phone, LinkedIn URL, notes and pasted CV text, linked to a job.
- **Kanban board:** six stages (applied, screening, interview, offer, hired, rejected) with drag-and-drop, filterable by job and candidate name.
- **Admin "act as customer":** admins can select a customer and do everything that customer can.
- **AI CV assessment:** compares pasted CV text against the job description and returns a 0–100 score and short summary. PDF/file upload is not supported.

## Tech stack

- React 19, TypeScript
- TanStack Start (Vite), Tailwind CSS v4
- Lovable-managed Supabase: Postgres, Auth, row-level security (RLS)
- Lovable AI Gateway for the CV assessment
- Vitest + React Testing Library

## Running locally

Requires Node.js (or Bun) and environment configuration for the backend and AI gateway. Credentials are not provided in this repository; do not commit or share them.

```sh
git clone https://github.com/soronity/talentflow-ats.git
cd talentflow-ats
npm install
npm run dev      # start dev server
npm test         # run the Vitest suite once (vitest run)
npm run lint     # ESLint
npm run build    # production build
```

## Verification status

- **Automated tests:** 14 Vitest unit/component test cases across four files in `src/test/` were reported passing on 2026-11-03. Most use mocked clients. They do **not** establish full integration, tenant isolation/security, or production readiness.
- **Manual checks (2026-11-09, deployed app):** targeted checks confirmed admin sign-in; admin selection of a customer workspace (BrightPlot); creating a job and seeing it listed; editing a synthetic candidate; moving a candidate between Kanban stages, persisting after refresh; AI CV assessment with the saved score and summary persisting across refresh; and full job descriptions visible on the Jobs page after the 2026-11-09 display fix. These are targeted checks, **not** comprehensive end-to-end coverage.
- **Not independently verified:** cross-customer/tenant isolation using separate customer accounts, and broader authorization, security and integration robustness. The app is **not** claimed to be production-ready.

See [DEVLOG.md](./DEVLOG.md) for details.
