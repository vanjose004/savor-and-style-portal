-- Soft Reserves — leads captured from the public /landing marketing page's
-- "Soft Reserve" CTA. A soft reserve is not a booking: the prospective
-- client fills out the form, is shown GCash/BPI payment instructions for the
-- ₱500 reservation fee, and sends a payment screenshot via Messenger. There
-- is no automated payment verification, so `status` exists purely for the
-- admin to track manually where each lead is in that follow-up flow.
--
-- Public insert follows the same SECURITY DEFINER RPC pattern as
-- submit_booking_request (migration 28) rather than a direct RLS insert
-- policy, so the public form can only ever write the specific columns this
-- function accepts.

create table soft_reserves (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  contact_number text not null,
  email text not null,
  event_type text not null,
  event_date date not null,
  estimated_guests integer not null check (estimated_guests > 0),
  preferred_package text,
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'converted', 'expired')),
  created_at timestamptz not null default now()
);

create index idx_soft_reserves_status on soft_reserves (status);
create index idx_soft_reserves_created_at on soft_reserves (created_at desc);

alter table soft_reserves enable row level security;

create policy "admins manage soft_reserves" on soft_reserves
  for all using (is_admin()) with check (is_admin());

create or replace function submit_soft_reserve(
  p_full_name text,
  p_contact_number text,
  p_email text,
  p_event_type text,
  p_event_date date,
  p_estimated_guests integer,
  p_preferred_package text,
  p_message text
)
returns table (id uuid) as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'Full name is required';
  end if;
  if coalesce(trim(p_contact_number), '') = '' then
    raise exception 'Contact number is required';
  end if;
  if coalesce(trim(p_email), '') = '' then
    raise exception 'Email is required';
  end if;
  if coalesce(trim(p_event_type), '') = '' then
    raise exception 'Event type is required';
  end if;
  if p_event_date is null then
    raise exception 'Event date is required';
  end if;
  if p_estimated_guests is null or p_estimated_guests <= 0 then
    raise exception 'Estimated guests is required';
  end if;

  insert into soft_reserves (
    full_name, contact_number, email, event_type, event_date,
    estimated_guests, preferred_package, message
  )
  values (
    trim(p_full_name), trim(p_contact_number), trim(p_email), p_event_type, p_event_date,
    p_estimated_guests, nullif(trim(p_preferred_package), ''), nullif(trim(p_message), '')
  )
  returning soft_reserves.id into v_id;

  return query select v_id;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function submit_soft_reserve(
  text, text, text, text, date, integer, text, text
) to anon, authenticated;
