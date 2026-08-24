SOLITAIRE Auth Fix
===================

Files:
- login.html              Replace the current login.html
- supabase-config.js      Replace the current supabase-config.js
- auth-guard.js           Replace the current auth-guard.js
- auth-test.html          Temporary diagnostic page

All files use the same Supabase project as the current repository.

Deployment:
1. Backup your existing files.
2. Replace the three main files above.
3. Commit/push to GitHub.
4. Open login.html and sign in using an existing Associate App Auth user.
5. Optional: open auth-test.html after login. It should show:
   session_exists: true
   auth_uid: <UUID>
6. Remove auth-test.html after testing.

Important:
These files fix the SOLITAIRE browser authentication/session flow.
They do NOT grant database permissions. Keep RLS enabled.

If the 42501 error is still coming from associate-app while an admin creates
business_associates/legal_team/technical_team/credit_team records, the insert
code in associate-app must also use the authenticated Supabase client/session.
