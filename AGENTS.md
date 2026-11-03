<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Roles live in `public.user_roles` and are checked with `has_role()` in RLS; never store roles on profiles (prevents privilege escalation).
- Every job/candidate row carries `customer_id`; RLS lets the owner or any admin access it, which is how admins "act as" a customer.
- Account creation, first-admin bootstrap and AI CV assessment run in server functions (`src/lib/ats.functions.ts`); public sign-up is disabled so only admins create accounts.
