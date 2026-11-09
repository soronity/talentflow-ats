# Admin password recovery (tim.elis.white@gmail.com)

Nothing has been run or changed.

## Direct answer
- **Is there a "reset password" action in the dashboard?** Not as far as the docs say. Lovable's docs say **More -> Users** has no reset-password button for another user. I can't see your screen, so check once: More -> Users -> click the admin's row or its "..." menu. If a "Send password recovery" option shows up, it sends an email.
- **Can it be done with no email, no file edits, no database change and no new user?** No. Each recovery path needs at least one of these:
  - an email (a reset link),
  - server code that runs with admin rights (setting the password, or making a reset link without sending it),
  - a new account.
  None of those admin-rights tools are open to you in the dashboard. I won't suggest editing password data in the database.

## Smallest secure option that keeps the same user ID, role and data
Allow one small code change and one email to the owner's own inbox:
1. Add a "Forgot password?" link to the sign-in page. It always shows the same message, whether or not the email exists.
2. Add a public `/reset-password` page that receives the email link and sets a new password (minimum 8 characters).
3. Publish, then on the live site: Sign in -> Forgot password? -> enter tim.elis.white@gmail.com -> open the email (check spam) -> set the new password -> sign in.
The user ID, admin role and all data stay as they are. Emails go out through Lovable's default sender, with an hourly limit.

Why not just send a recovery email from the dashboard: with no `/reset-password` page, the link just signs the owner in. They can't set a password, and they'd be locked out again after signing out.

## If no code change is allowed
The only route is a second account: More -> Users -> Add user -> Create new user. An admin role then has to be added for it, which is a database change. The original account stays locked out.

## Technical details (option above)
- `src/routes/auth.tsx`: `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + "/reset-password" })`.
- New `src/routes/reset-password.tsx` (public, ssr:false): wait for the PASSWORD_RECOVERY event, then `supabase.auth.updateUser({ password })` (no current_password), then go to /board.
- Published and preview addresses are already on the allowed redirect list.
