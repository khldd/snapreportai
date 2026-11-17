-- ============================================================================
-- SnapReport — Webinar live-input form (#ai-input)
-- Run ONCE in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Security model (why this is safe to expose to the public internet):
--   1. Row Level Security is ON for all data tables with NO policies:
--      anon/authenticated can never read, list, update or delete a single row,
--      even if they call the REST API directly with the public anon key.
--   2. The public site may only call the public form functions, both validated:
--        webinar_form_enabled()  → true/false kill-switch check
--        submit_webinar_lead(b)  → validates everything server-side, then inserts
--      Authenticated users may call get_webinar_leads() only if their UUID is
--      explicitly allowlisted in webinar_admins.
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
  help       text[] check (help is null or help <@ array['demo','training','reporting','regulatory']::text[]),
  ai_training text check (ai_training is null or ai_training in ('yes','no')),
  pace       text check (pace is null or pace in ('exploring','three_months','quarter','now')),
  notes      text,
  form_data  jsonb not null default '{}'::jsonb,
  consent    boolean not null check (consent = true)   -- nothing is stored without consent
);

-- Add the latest form fields when upgrading an existing webinar_leads table.
alter table public.webinar_leads add column if not exists help text[];
alter table public.webinar_leads add column if not exists ai_training text;
alter table public.webinar_leads add column if not exists form_data jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.webinar_leads'::regclass
      and conname = 'webinar_leads_help_check'
  ) then
    alter table public.webinar_leads
      add constraint webinar_leads_help_check
      check (help is null or help <@ array['demo','training','reporting','regulatory']::text[]);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.webinar_leads'::regclass
      and conname = 'webinar_leads_ai_training_check'
  ) then
    alter table public.webinar_leads
      add constraint webinar_leads_ai_training_check
      check (ai_training is null or ai_training in ('yes','no'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.webinar_leads'::regclass
      and conname = 'webinar_leads_form_data_check'
  ) then
    alter table public.webinar_leads
      add constraint webinar_leads_form_data_check
      check (jsonb_typeof(form_data) = 'object');
  end if;
end;
$$;

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

-- Admin membership is managed only from the Supabase SQL editor. A user cannot
-- grant themselves access through the public API.
create table if not exists public.webinar_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.webinar_admins enable row level security;
revoke all on public.webinar_admins from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Public form RPCs
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
  v_help      text[];
  v_ai_training text;
  v_pace     text;
  v_notes    text;
  v_lang     text;
  v_fill_ms  integer;
  v_consented boolean;
  v_form_data jsonb;
  v_contact_channel text;
begin
  if jsonb_typeof(payload) is distinct from 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

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
  v_name    := left(btrim(regexp_replace(coalesce(payload->>'full_name', ''), '[[:cntrl:]]', '', 'g')), 120);
  v_email   := left(btrim(coalesce(payload->>'email', '')), 160);
  v_company := left(btrim(coalesce(payload->>'company', '')), 160);

  if char_length(v_name) < 2 or char_length(v_company) < 2 then
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
      where n is null or n not in ('reports','quality','clients','data','production','marketing','forecasts','other')
    ) then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;

  -- (6) Requested help: a JSON array restricted to known options.
  if jsonb_typeof(coalesce(payload->'help', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(payload->'help', '[]'::jsonb)) > 4 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  select array_agg(distinct left(btrim(value), 40))
    into v_help
    from jsonb_array_elements_text(coalesce(payload->'help', '[]'::jsonb)) as value;

  if v_help is not null then
    if exists (
      select 1 from unnest(v_help) as h
      where h is null or h not in ('demo','training','reporting','regulatory')
    ) then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;

  v_ai_training := nullif(btrim(coalesce(payload->>'ai_training', '')), '');
  if v_ai_training is not null and v_ai_training not in ('yes','no') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- (7) Free-text notes: optional and capped.
  v_notes := nullif(left(btrim(coalesce(payload->>'notes', '')), 1000), '');
  if v_notes = '' then v_notes := null; end if;

  -- (8) Language + consent (nothing is stored without it).
  v_lang := coalesce(nullif(btrim(coalesce(payload->>'lang', '')), ''), 'fr');
  if v_lang not in ('fr','en') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  v_consented := coalesce((payload->>'consent')::boolean, false);
  if v_consented is not true then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  -- Store the new questionnaire answers as structured JSON without exposing a
  -- public table insert path or changing the normalized lead columns.
  v_form_data := coalesce(payload->'form_data', '{}'::jsonb);
  if jsonb_typeof(v_form_data) is distinct from 'object'
     or octet_length(v_form_data::text) > 16000 then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if v_form_data ? 'interest' then
    if jsonb_typeof(v_form_data->'interest') is distinct from 'array' then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    if jsonb_array_length(v_form_data->'interest') < 1
       or jsonb_array_length(v_form_data->'interest') > 4 then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    if exists (
      select 1
      from jsonb_array_elements_text(v_form_data->'interest') as value
      where value is null or value not in ('demo','formation','diagnostic','projet')
    ) then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    if v_form_data ? 'products' then
      if jsonb_typeof(v_form_data->'products') is distinct from 'array' then
        return jsonb_build_object('ok', false, 'error', 'invalid');
      end if;

      if jsonb_array_length(v_form_data->'products') > 5 then
        return jsonb_build_object('ok', false, 'error', 'invalid');
      end if;

      if exists (
        select 1
        from jsonb_array_elements_text(v_form_data->'products') as value
        where value is null or value not in ('myQA.team','LÆRN','AgroBot','CaptureIQ','conseil')
      ) then
        return jsonb_build_object('ok', false, 'error', 'invalid');
      end if;
    end if;

    if v_form_data->'interest' @> '["demo"]'::jsonb
       and jsonb_array_length(coalesce(v_form_data->'products', '[]'::jsonb)) < 1 then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;

  if v_form_data ? 'training_audience' then
    if jsonb_typeof(v_form_data->'training_audience') is distinct from 'array' then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
    if jsonb_array_length(v_form_data->'training_audience') > 5
       or exists (
         select 1
         from jsonb_array_elements_text(v_form_data->'training_audience') as value
         where value is null or value not in ('direction','managers','metier','it','moi')
       ) then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;

  if v_form_data ? 'pain_points' then
    if jsonb_typeof(v_form_data->'pain_points') is distinct from 'array' then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
    if jsonb_array_length(v_form_data->'pain_points') > 6
       or exists (
         select 1
         from jsonb_array_elements_text(v_form_data->'pain_points') as value
         where value is null or value not in ('veille_reglementaire','audit_interne','nc_actions_correctives','inspection_qhse','analyse_donnees','autre')
       ) then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;

  if coalesce(v_form_data->>'timeline', '') not in ('','maintenant','3mois','6mois','info')
     or coalesce(v_form_data->>'company_size', '') not in ('','1-10','11-50','51-250','250+')
     or coalesce(v_form_data->>'country', '') not in ('','TN','FR','CH','MA','DZ','autre')
     or coalesce(v_form_data->>'training_size', '') not in ('','1-5','6-15','16-50','50+')
     or coalesce(v_form_data->>'training_format', '') not in ('','presentiel','distanciel','hybride')
     or coalesce(v_form_data->>'project_stage', '') not in ('','idee','cadre','pret')
     or coalesce(v_form_data->>'slot', '') not in ('','matin','apres-midi','indifferent')
     or coalesce(v_form_data->>'webinar_rating', '') not in ('','1','2','3','4','5')
     or coalesce(v_form_data->>'role', '') not in ('','direction','operations','qualite','rh','commercial','it','autre')
     or coalesce(v_form_data->>'sector', '') not in ('','agroalimentaire','agriculture','industrie','distribution','sante','education','services','tech','public','autre') then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if v_form_data ? 'newsletter' and jsonb_typeof(v_form_data->'newsletter') is distinct from 'boolean' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if v_form_data ? 'contact_channel' then
    v_contact_channel := v_form_data->>'contact_channel';
    if v_contact_channel is null or v_contact_channel not in ('email','appel','whatsapp') then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;

    if v_contact_channel in ('appel','whatsapp')
       and char_length(regexp_replace(coalesce(v_form_data->>'phone', ''), '[^0-9]', '', 'g')) < 8 then
      return jsonb_build_object('ok', false, 'error', 'invalid');
    end if;
  end if;

  -- (9) Light rate-limit: same email can't spam the table.
  if exists (
    select 1 from public.webinar_leads
    where email_norm = lower(v_email)
      and created_at > now() - interval '60 seconds'
  ) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  -- (10) Insert. The server decides the campaign tag — never the client.
  insert into public.webinar_leads
    (source, lang, full_name, email, company, role, sector, needs, help, ai_training, pace, notes, form_data, consent)
  values
    (v_source, v_lang, v_name, v_email, v_company, v_role, v_sector, v_needs, v_help, v_ai_training, v_pace, v_notes, v_form_data, true);

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

-- Return a capped page of leads only to explicitly allowlisted Auth users.
-- The dashboard never receives direct table privileges.
create or replace function public.get_webinar_leads(
  p_limit integer default 25,
  p_offset integer default 0,
  p_search text default ''
)
returns table(total_count bigint, lead_rows jsonb)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_search text := left(btrim(coalesce(p_search, '')), 120);
begin
  if auth.uid() is null
     or not exists (
       select 1
       from public.webinar_admins as admins
       where admins.user_id = auth.uid()
     ) then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;

  return query
  with filtered as (
    select
      leads.id,
      leads.created_at,
      leads.source,
      leads.lang,
      leads.full_name,
      leads.email,
      leads.company,
      leads.role,
      leads.sector,
      leads.needs,
      leads.help,
      leads.ai_training,
      leads.pace,
      leads.notes,
      leads.form_data
    from public.webinar_leads as leads
    where v_search = ''
       or leads.full_name ilike '%' || v_search || '%'
       or leads.email ilike '%' || v_search || '%'
       or leads.company ilike '%' || v_search || '%'
       or coalesce(leads.notes, '') ilike '%' || v_search || '%'
       or leads.form_data::text ilike '%' || v_search || '%'
  ),
  page as (
    select filtered.id, filtered.created_at, to_jsonb(filtered) as lead
    from filtered
    order by filtered.created_at desc, filtered.id desc
    limit v_limit
    offset v_offset
  )
  select
    (select count(*) from filtered),
    coalesce((select jsonb_agg(page.lead order by page.created_at desc, page.id desc) from page), '[]'::jsonb);
end;
$$;

revoke all on function public.get_webinar_leads(integer, integer, text) from public, anon, authenticated;
grant execute on function public.get_webinar_leads(integer, integer, text) to authenticated;

-- ----------------------------------------------------------------------------
-- Done. Quick reference:
--   Close the form:  update public.webinar_form_config set enabled = false;
--   Reopen it:       update public.webinar_form_config set enabled = true;
--   Read the leads:  Table Editor → webinar_leads (or Export CSV)
--   Sanity check:    select public.webinar_form_enabled();   → should print true
-- ----------------------------------------------------------------------------

notify pgrst, 'reload schema';
