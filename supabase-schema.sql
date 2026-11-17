-- ============================================================================
-- SnapReport — Webinar live-input form (#ai-input)
-- Run ONCE in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Security model (why this is safe to expose to the public internet):
--   1. Row Level Security is ON for both tables with NO policies:
--      anon/authenticated can never read, list, update or delete a single row,
--      even if they call the REST API directly with the public anon key.
--   2. The public site may only call TWO functions, both heavily validated:
--        webinar_form_enabled()  → true/false kill-switch check
--        submit_webinar_lead(b)  → validates everything server-side, then inserts
--      Direct inserts into webinar_leads are impossible for the public.
--   3. The kill switch lives in webinar_form_config and is enforced HERE
--      (server-side), not just in the page JS. Flip it and the API refuses.
--   4. No IP addresses, no cookies, no trackers are stored.
--
-- After the webinar:
--   Export CSV:  Table Editor → webinar_leads → "Export CSV"
--   Kill switch: update public.webinar_form_config set enabled = false;
--   Re-open:     update public.webinar_form_config set enabled = true;
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------

-- One row only (id is locked to 1). `enabled` is your kill switch.
create table if not exists public.webinar_form_config (
  id         integer primary key default 1 check (id = 1),
  enabled    boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.webinar_form_config (id, enabled) values (1, true)
on conflict (id) do nothing;

-- The leads themselves.
create table if not exists public.webinar_leads (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source     text not null,                 -- campaign tag, set by the server
  lang       text not null check (lang in ('fr','en')),
  full_name  text not null,
  email      text not null,
  email_norm text generated always as (lower(email)) stored,
  company    text not null,
  role       text check (role is null or role in ('direction','operations','quality','sales','it','other')),
  sector     text check (sector is null or sector in ('agro','industry','distribution','services','tech','health','other')),
  needs      text[] check (needs is null or needs <@ array['reports','quality','clients','data','production','marketing','forecasts','other']::text[]),
  pace       text check (pace is null or pace in ('exploring','three_months','quarter','now')),
  notes      text,
  consent    boolean not null check (consent = true)   -- nothing is stored without consent
);

-- One answer per email per campaign (repeat submits are idempotent, not duplicated).
create unique index if not exists webinar_leads_source_email_key
  on public.webinar_leads (source, email_norm);

-- ----------------------------------------------------------------------------
-- 2. Lock the tables down completely
-- ----------------------------------------------------------------------------

alter table public.webinar_form_config enable row level security;
alter table public.webinar_leads      enable row level security;

-- No policies are created on purpose: with RLS on and zero policies,
-- anon/authenticated get NOTHING (no select, no insert, no update, no delete).
-- Belt and braces — strip every existing grant too:
revoke all on public.webinar_form_config from anon, authenticated;
revoke all on public.webinar_leads      from anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. The only two functions the public may call
-- ----------------------------------------------------------------------------

-- Kill-switch check. Returns true only while the form is open.
create or replace function public.webinar_form_enabled()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select enabled from public.webinar_form_config where id = 1;
$$;

-- The single entry point for submissions. Validates everything server-side.
create or replace function public.submit_webinar_lead(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_source   constant text := 'webinar-2026-11';
  v_name     text;
  v_email    text;
  v_company  text;
  v_role     text;
  v_sector   text;
  v_needs    text[];
  v_pace     text;
  v_notes    text;
  v_lang     text;
  v_fill_ms  integer;
  v_consented boolean;
begin
  -- (0) Kill switch — the API itself refuses when the form is closed.
  if not public.webinar_form_enabled() then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;

  -- (1) Honeypot: real users never fill the hidden "website" field.
  --     Bots get a fake success and nothing is stored.
  if coalesce(payload->>'website', '') <> '' then
    return jsonb_build_object('ok', true, 'dropped', true);
  end if;

  -- (2) Fill-time guard: humans take at least ~1.2s on this form.
  v_fill_ms := coalesce(nullif(payload->>'fill_ms', '')::integer, 0);
  if v_fill_ms < 1200 or v_fill_ms > 7200000 then
    return jsonb_build_object('ok', false, 'error', 'rejected');
  end if;

  -- (3) Required text fields, trimmed, control chars stripped, length-capped.
  v_name    := left(btrim(regexp_replace(coalesce(payload->>'full_name', ''), '[[:cntrl:]]', '', 'g'), E'\\s+'), 120);
  v_email   := left(btrim(coalesce(payload->>'email', '')), 160);
  v_company := left(btrim(coalesce(payload->>'company', '')), 160);

  if v_name < 2 or v_company < 2 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_email := btrim(v_email);
  if v_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- (4) Optional enum fields — anything outside the whitelist is rejected.
  v_role := nullif(btrim(coalesce(payload->>'role', '')), '');
  if v_role is not null and v_role not in ('direction','operations','quality','sales','it','other') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_sector := nullif(btrim(coalesce(payload->>'sector', '')), '');
  if v_sector is not null and v_sector not in ('agro','industry','distribution','services','tech','health','other') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_pace := nullif(btrim(coalesce(payload->>'pace', '')), '');
  if v_pace is not null and v_pace not in ('exploring','three_months','quarter','now') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- (5) Needs: a JSON array that must be a subset of the whitelist, max 8 items.
  if jsonb_typeof(coalesce(payload->'needs', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(payload->'needs', '[]'::jsonb)) > 8 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select array_agg(distinct left(btrim(value), 40))
    into v_needs
    from jsonb_array_elements_text(coalesce(payload->'needs', '[]'::jsonb)) as value;

  if v_needs is not null then
    if exists (
      select 1 from unnest(v_needs) as n
      where n not in ('reports','quality','clients','data','production','marketing','forecasts','other')
    ) then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;

  -- (6) Free-text notes: optional, capped, null bytes removed.
  v_notes := nullif(left(btrim(replace(coalesce(payload->>'notes', ''), chr(0), '')), 1000), '');
  if v_notes = '' then v_notes := null; end if;

  -- (7) Language + consent (nothing is stored without it).
  v_lang := coalesce(nullif(btrim(coalesce(payload->>'lang', '')), ''), 'fr');
  if v_lang not in ('fr','en') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_consented := coalesce((payload->>'consent')::boolean, false);
  if v_consented is not true then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- (8) Light rate-limit: same email can't spam the table.
  if exists (
    select 1 from public.webinar_leads
    where email_norm = lower(v_email)
      and created_at > now() - interval '60 seconds'
  ) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  -- (9) Insert. The server decides the campaign tag — never the client.
  insert into public.webinar_leads
    (source, lang, full_name, email, company, role, sector, needs, pace, notes, consent)
  values
    (v_source, v_lang, v_name, v_email, v_company, v_role, v_sector, v_needs, v_pace, v_notes, true);

  return jsonb_build_object('ok', true);

exception
  when unique_violation then
    -- Same person answered twice: no error for them, no duplicate row.
    return jsonb_build_object('ok', true, 'duplicate', true);
  when others then
    return jsonb_build_object('ok', false, 'error', 'rejected');
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Grant the public EXACTLY two doors — nothing else
-- ----------------------------------------------------------------------------

revoke all on function public.submit_webinar_lead(jsonb) from public, authenticated;
grant  execute on function public.submit_webinar_lead(jsonb) to anon;

revoke all on function public.webinar_form_enabled() from public, authenticated;
grant  execute on function public.webinar_form_enabled() to anon;

-- ----------------------------------------------------------------------------
-- Done. Quick reference:
--   Close the form:  update public.webinar_form_config set enabled = false;
--   Reopen it:       update public.webinar_form_config set enabled = true;
--   Read the leads:  Table Editor → webinar_leads (or Export CSV)
--   Sanity check:    select public.webinar_form_enabled();   → should print true
-- ----------------------------------------------------------------------------
