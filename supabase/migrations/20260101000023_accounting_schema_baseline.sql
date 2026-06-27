-- Savor and Style Catering Services — Accounting schema baseline
--
-- The `transactions`, `expenses`, `payables`, and `payable_payments` tables
-- (plus their code generators and recalculation triggers) already exist on
-- the live database — they were created directly via SQL for the separate
-- "Savor and Style Accounting" app, which shares this same Supabase project
-- but was never captured in this repo's migration history. This migration
-- adopts that existing schema verbatim so it's reproducible from this repo.
-- Every statement is idempotent — running this against the live database is
-- a no-op confirmation, not a change.

do $$ begin
  create type payable_status as enum ('unpaid', 'partial', 'paid');
exception when duplicate_object then null;
end $$;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_code text not null unique,
  type text not null default 'income' check (type = 'income'),
  category text not null check (category in ('reservation_fee', 'downpayment', 'balance', 'other_income')),
  amount numeric not null check (amount > 0),
  booking_ref text,
  client_name text not null,
  payment_method text not null check (payment_method in ('GCash', 'Cash', 'Bank Transfer', 'Credit Card', 'Maya', 'Check')),
  reference_number text,
  notes text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_code text not null unique,
  category text not null check (category in (
    'ingredients', 'staff_labor', 'transportation', 'bills_utilities', 'equipment',
    'utang_payment', 'marketing_ads', 'owner_salary', 'chef_salary', 'event_supplies', 'others'
  )),
  description text not null,
  amount numeric not null check (amount > 0),
  is_event_expense boolean not null default false,
  booking_ref text,
  payment_method text not null check (payment_method in ('Cash', 'GCash', 'Bank Transfer', 'Credit Card')),
  receipt_notes text,
  expense_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists payables (
  id uuid primary key default gen_random_uuid(),
  payable_code text not null unique,
  creditor_name text not null,
  description text not null,
  total_amount numeric not null check (total_amount > 0),
  amount_paid numeric not null default 0,
  balance numeric not null default 0,
  status payable_status not null default 'unpaid',
  due_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists payable_payments (
  id uuid primary key default gen_random_uuid(),
  payable_id uuid not null references payables(id) on delete cascade,
  amount numeric not null check (amount > 0),
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Code generators: TXN-YYYY-NNNN / EXP-YYYY-NNNN / PAY-YYYY-NNNN
-- ─────────────────────────────────────────────────────────────────────────

create or replace function generate_transaction_code()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_prefix text := 'TXN-' || v_year || '-';
  v_seq int;
  v_code text;
begin
  perform pg_advisory_xact_lock(hashtext(v_prefix));

  loop
    select coalesce(max(substring(transaction_code from length(v_prefix) + 1)::int), 0) + 1
    into v_seq
    from transactions
    where transaction_code like v_prefix || '%';

    v_code := v_prefix || lpad(v_seq::text, 4, '0');

    exit when not exists (select 1 from transactions where transaction_code = v_code);
  end loop;

  return v_code;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function generate_expense_code()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_prefix text := 'EXP-' || v_year || '-';
  v_seq int;
  v_code text;
begin
  perform pg_advisory_xact_lock(hashtext(v_prefix));

  loop
    select coalesce(max(substring(expense_code from length(v_prefix) + 1)::int), 0) + 1
    into v_seq
    from expenses
    where expense_code like v_prefix || '%';

    v_code := v_prefix || lpad(v_seq::text, 4, '0');

    exit when not exists (select 1 from expenses where expense_code = v_code);
  end loop;

  return v_code;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function generate_payable_code()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_prefix text := 'PAY-' || v_year || '-';
  v_seq int;
  v_code text;
begin
  perform pg_advisory_xact_lock(hashtext(v_prefix));

  loop
    select coalesce(max(substring(payable_code from length(v_prefix) + 1)::int), 0) + 1
    into v_seq
    from payables
    where payable_code like v_prefix || '%';

    v_code := v_prefix || lpad(v_seq::text, 4, '0');

    exit when not exists (select 1 from payables where payable_code = v_code);
  end loop;

  return v_code;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_transactions_before_insert()
returns trigger as $$
begin
  if new.transaction_code is null or new.transaction_code = '' then
    new.transaction_code := generate_transaction_code();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_expenses_before_insert()
returns trigger as $$
begin
  if new.expense_code is null or new.expense_code = '' then
    new.expense_code := generate_expense_code();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_payables_before_insert()
returns trigger as $$
begin
  if new.payable_code is null or new.payable_code = '' then
    new.payable_code := generate_payable_code();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists transactions_before_insert on transactions;
create trigger transactions_before_insert
before insert on transactions
for each row execute function trg_transactions_before_insert();

drop trigger if exists expenses_before_insert on expenses;
create trigger expenses_before_insert
before insert on expenses
for each row execute function trg_expenses_before_insert();

drop trigger if exists payables_before_insert on payables;
create trigger payables_before_insert
before insert on payables
for each row execute function trg_payables_before_insert();

-- ─────────────────────────────────────────────────────────────────────────
-- Payables balance/status recalculation
-- ─────────────────────────────────────────────────────────────────────────

create or replace function trg_payables_recalc()
returns trigger as $$
begin
  new.balance := new.total_amount - new.amount_paid;

  if new.balance <= 0 then
    new.status := 'paid';
  elsif new.amount_paid > 0 then
    new.status := 'partial';
  else
    new.status := 'unpaid';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists payables_recalc on payables;
create trigger payables_recalc
before insert or update on payables
for each row execute function trg_payables_recalc();

create or replace function recalc_payable(p_payable_id uuid)
returns void as $$
begin
  update payables
  set amount_paid = coalesce(
    (select sum(amount) from payable_payments where payable_id = p_payable_id), 0
  )
  where id = p_payable_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_payable_payments_recalc()
returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    perform recalc_payable(old.payable_id);
    return old;
  end if;

  perform recalc_payable(new.payable_id);

  if (tg_op = 'UPDATE' and new.payable_id <> old.payable_id) then
    perform recalc_payable(old.payable_id);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists payable_payments_recalc on payable_payments;
create trigger payable_payments_recalc
after insert or update or delete on payable_payments
for each row execute function trg_payable_payments_recalc();

-- ─────────────────────────────────────────────────────────────────────────
-- RLS — admin only, same pattern as the rest of the portal
-- ─────────────────────────────────────────────────────────────────────────

alter table transactions enable row level security;
alter table expenses enable row level security;
alter table payables enable row level security;
alter table payable_payments enable row level security;

drop policy if exists "admins manage transactions" on transactions;
create policy "admins manage transactions" on transactions
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admins manage expenses" on expenses;
create policy "admins manage expenses" on expenses
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admins manage payables" on payables;
create policy "admins manage payables" on payables
  for all using (is_admin()) with check (is_admin());

drop policy if exists "admins manage payable_payments" on payable_payments;
create policy "admins manage payable_payments" on payable_payments
  for all using (is_admin()) with check (is_admin());
