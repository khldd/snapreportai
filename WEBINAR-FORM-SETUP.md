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

If you already ran an earlier version of this script, run the updated script again. It adds the `help` and `ai_training` columns and updates the submission function without deleting existing leads.

## 3. Connect the site (2 min)

1. In the dashboard: **Project Settings → API**.
2. Copy **Project URL** and the **anon public** key (NOT the service_role key — that one must never touch the site).
3. Paste both at the very top of **`js\webinar-form.js`**, then copy the file to **`deploy\js\webinar-form.js`** (the two copies must stay identical):

```js
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "eyJ...long-key...";
```

## 4. Test before the webinar

Open `clients-form.html` in a browser, fill the form, submit. Then check **Table Editor → webinar_leads** — the row is there.

Test the guards too if you want:
- Submitting twice with the same email → second submit shows success but creates **no duplicate row**.
- Reopening the page and submitting in under 3 seconds → polite "review your answers" message.
- Paste `update public.webinar_form_config set enabled = false;` in the SQL editor → reload the page → **the section and its nav links disappear**. Direct API calls to insert are also refused. Set back to `true` to reopen.

## 5. Publish

Commit and push the changes; Vercel serves the `deploy/` directory. The audience goes to **`snapreportai.com/clients-form.html`** — put that exact URL on the webinar screen.

## 6. During / after the webinar

| Action | Command / click |
|---|---|
| Close the form instantly | SQL Editor: `update public.webinar_form_config set enabled = false;` |
| See answers live | Table Editor → `webinar_leads` |
| Export | Table Editor → `webinar_leads` → **Export CSV** |

## Why the anon key being public is fine

- **RLS with zero policies** on both tables: the public key grants no read/list/update/delete — nobody can dump the leads, ever.
- Public code can only call **one insert function** that validates everything server-side (whitelisted values, email format, length caps, honeypot, fill-time, consent, rate limit) and refuses when the kill switch is off.
- TLS in transit, AES-256 at rest (Supabase default). No IPs, no cookies, no trackers stored.
- Only the **anon** key is in the site code. The **service_role** key stays in the dashboard.

## File map

| File | Role |
|---|---|
| `supabase-schema.sql` | Idempotent database setup and upgrade (tables, RLS, functions, policies) |
| `js\webinar-form.js` + `deploy\js\webinar-form.js` | Form logic + FR/EN dictionary (keep both copies identical) |
| `clients-form.html` / `deploy\clients-form.html` | Dedicated FR/EN webinar form page |

When you migrate to your self-hosted database later: `pg_dump` the two tables, restore on your server, and point the form's `SUPABASE_URL` at your own API.
