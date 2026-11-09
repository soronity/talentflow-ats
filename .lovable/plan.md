# Admin password recovery for TalentFlow (investigation result)

No changes have been made. This covers what can be done, and the one small change that would be needed if the dashboard can't help.

## What is confirmed vs uncertain
- Confirmed: the sign-in page has no "Forgot password" link, and the app has no page for setting a new password.
- Confirmed (from Lovable docs): **More -> Users** lists the app's users. According to the docs it has **no "reset password" button** for another user. **Add user** offers "Send invitation" or "Create new user" (email + password, already confirmed).
- Uncertain: whether a user row's menu in More -> Users has a "Send password recovery" action. I can't see the UI from here, so check it in step 1.
- Email delivery: auth emails can go out through Lovable's default sender, even without your own email domain. There is a hourly sending limit, and the email may land in spam. But a reset link only works if the app has a page that receives it, and TalentFlow doesn't have one yet.

## Fastest safe procedure

### Step 1: check the dashboard (2 minutes, no code)
1. In the project editor, open **More** (desktop) -> **Users**.
2. Find the admin's email in the list, and open its row or its "..." menu.
3. If you see **Send password recovery / Reset password**, don't use it yet. The link would open the app signed in, with no page to type a new password. Go to step 2 first, or use the fallback below.

### Step 2 (recommended): add a small, standard reset flow
This needs your approval because it changes code:
- Add a "Forgot password?" link on the sign-in page. It sends the reset email to the address typed in, and says the same thing whether or not that account exists.
- Add a public `/reset-password` page that receives the email link and lets the user set a new password (minimum 8 characters).
- Publish, then request the reset for the admin email from the live app, open the email (check spam), set the new password and sign in.
This also gives customers self-service recovery for QA and the demo.

### Fallback: no email, no code
1. In **More -> Users -> Add user -> Create new user**, create a second account with an email you control and a strong password.
2. That account has no admin role yet. Giving it the role means adding one role record in the database (a database write that you approve). It does not touch any passwords.
3. Sign in with the new admin account. The old admin account stays as it is (it can be deleted later under More -> Users).
Downside: you end up with two admin accounts, and the original password is still lost.

## Not recommended
- Editing password hashes in the database directly.
- A one-off server function that sets the password, unless it is checked for an admin and removed afterwards. It's more risky than step 2.

## Technical details (step 2)
- `src/routes/auth.tsx`: forgot link -> `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" })`.
- New `src/routes/reset-password.tsx` (public, ssr:false): waits for the PASSWORD_RECOVERY session, then `supabase.auth.updateUser({ password })`, then navigates to /board.
- Redirect URL: published + preview origins are already allowed automatically by Lovable.
