# Webinar live-input form — setup guide

The form lives on the dedicated page **`snapreportai.com/clients-form.html`**, linked from the main site. French by default, EN toggle at the top of the form. Answers go to Supabase with bank-safe rules: nobody in the world can read the data except you, and the form can be closed in one command at any moment.

## 1. Create the Supabase project (~3 min)

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Name: `snapreport-webinar`. Region: **Frankfurt (eu-central-1)** — closest to your EU/Tunisia audience.
3. Save the database password somewhere safe. Free tier is enough.

## 2. Create the tables and security (1 min)

1. In the dashboard: **SQL Editor** → **New query**.
2. Paste the whole content of **`supabase-schema.sql`** (repo root) → **Run**.
3. Verify: it should end with no errors. Run `select public.webinar_form_enabled();` → should return `true`.

If you already ran an earlier version of this script, run the updated script again. It adds the `form_data` JSON column for the expanded questionnaire, updates the submission function, and creates the admin allowlist and protected results function without deleting existing leads.

## 3. Connect the site (2 min)

1. In the dashboard: **Project Settings → API**.
2. Copy **Project URL** and the **anon public** key (NOT the service_role key — that one must never touch the site).
3. Paste both at the top of **`js\webinar-form.js`** and **`js\admin-dashboard.js`**, then copy each file to its matching file under **`deploy\js\`** (each source/deploy pair must stay identical):

```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...long-key...";
```

## 4. Enable the private dashboard

The private dashboard is at **`snapreportai.com/admin.html`**. It uses Supabase Auth email/password sign-in. Signing in is not enough: only user IDs explicitly added to `public.webinar_admins` can read responses. The dashboard does not store access or refresh tokens in browser storage.

1. In Supabase, open **Authentication → Users** and create the administrator account. Confirm the email, use a unique, strong password, and share it only with that administrator.
2. Copy the new user's UUID.
3. In **SQL Editor**, authorize that exact UUID:

```sql
insert into public.webinar_admins (user_id)
values ('PASTE-AUTH-USER-UUID-HERE')
on conflict (user_id) do nothing;
```

To revoke dashboard access, delete the user's allowlist entry:

```sql
delete from public.webinar_admins
where user_id = 'PASTE-AUTH-USER-UUID-HERE';
```

Never put an Auth password or the Supabase `service_role` key in the site. The browser uses only the project's public/anon key; Postgres checks admin membership on every results request and keeps direct table access blocked. The URL and public key at the top of `js\admin-dashboard.js` must match the form's Supabase project.

## 5. Test before the webinar

Open `clients-form.html` in a browser, fill the form, submit. Then check **Table Editor → webinar_leads** — the row is there.

Test the guards too if you want:
- Submitting twice with the same email → second submit shows success but creates **no duplicate row**.
- Reopening the page and submitting in under 3 seconds → polite "review your answers" message.
- Paste `update public.webinar_form_config set enabled = false;` in the SQL editor → reload the page → **the section and its nav links disappear**. Direct API calls to insert are also refused. Set back to `true` to reopen.

## 6. Publish

Commit and push the changes; Vercel serves the `deploy/` directory. The audience goes to **`snapreportai.com/clients-form.html`** — put that exact URL on the webinar screen.

## 7. During / after the webinar

| Action | Command / click |
|---|---|
| Close the form instantly | SQL Editor: `update public.webinar_form_config set enabled = false;` |
| See answers live | Sign in at `/admin.html` with an allowlisted Supabase Auth account |
| Export | Table Editor → `webinar_leads` → **Export CSV** |

## Why the anon key being public is fine

- **RLS with zero policies** on the data and admin tables: the public key grants no direct read/list/update/delete access to leads.
- Public code can only call the form functions: one checks the kill switch, and one validates submissions server-side (whitelisted values, email format, length caps, honeypot, fill-time, consent, rate limit).
- The results function is executable only by Supabase Auth users and returns data only when their UUID is present in `webinar_admins`. Reads are paginated and capped; admin membership is managed in the SQL Editor, not through the public API.
- TLS in transit, AES-256 at rest (Supabase default). No IPs, no cookies, no trackers stored.
- Only the **anon** key is in the site code. The **service_role** key stays in the dashboard.

## File map

| File | Role |
|---|---|
| `supabase-schema.sql` | Idempotent database setup and upgrade (tables, RLS, and protected functions) |
| `js\webinar-form.js` + `deploy\js\webinar-form.js` | Form logic + FR/EN dictionary (keep both copies identical) |
| `clients-form.html` / `deploy\clients-form.html` | Dedicated FR/EN webinar form page |
| `admin.html` / `deploy\admin.html` | Supabase Auth login and private, paginated results dashboard |
| `js\admin-dashboard.js` / `deploy\js\admin-dashboard.js` | In-memory Auth session, protected results requests, and safe text rendering |

When you migrate to your self-hosted database later: `pg_dump` the two tables, restore on your server, and point the form's `SUPABASE_URL` at your own API.
