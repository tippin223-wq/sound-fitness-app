create extension if not exists pgcrypto;

-- Completed onboarding assessments. Until now these never left the visitor's
-- browser, so a finished assessment reached nobody. Every submission lands here
-- first, then we try to email it — so a mail failure loses the email, not the
-- lead.
create table public.lead_assessments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Contact
  email text not null,
  full_name text,
  phone text,

  -- The full questionnaire, verbatim, so we can re-derive anything later
  -- without a migration every time the questions change.
  answers jsonb not null,

  -- The computed outcome, denormalised for easy reading/reporting.
  result_title text,
  result_focus text,
  service_pills text[],

  -- Delivery bookkeeping.
  emailed_at timestamptz,
  email_error text,

  constraint lead_assessments_email_not_blank check (length(trim(email)) > 0)
);

create index lead_assessments_created_at_idx
  on public.lead_assessments (created_at desc);
create index lead_assessments_email_idx on public.lead_assessments (email);

alter table public.lead_assessments enable row level security;

-- No anon/authenticated policies on purpose: the public questionnaire posts to
-- our own API route, which writes with the service role. Leads carry contact
-- details, so nothing client-side should be able to read or write this table.
-- Staff read access can be added later against the profiles role.
