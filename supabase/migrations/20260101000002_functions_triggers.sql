-- Savor and Style Catering Services — Functions & triggers
-- Auto-numbering, balance computation, credit card fees, and timeline automation

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at maintenance
-- ─────────────────────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_set_updated_at
before update on bookings
for each row execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Booking code generator: SS-YYYY-NNN
-- ─────────────────────────────────────────────────────────────────────────

create or replace function generate_booking_code()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from bookings
  where booking_code like 'SS-' || v_year || '-%';

  return 'SS-' || v_year || '-' || lpad(v_seq::text, 3, '0');
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_bookings_before_insert()
returns trigger as $$
begin
  if new.booking_code is null or new.booking_code = '' then
    new.booking_code := generate_booking_code();
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_before_insert
before insert on bookings
for each row execute function trg_bookings_before_insert();

-- ─────────────────────────────────────────────────────────────────────────
-- Balance computation: bookings.balance = total_amount - sum(payments.amount)
-- ─────────────────────────────────────────────────────────────────────────

create or replace function recalc_booking_balance(p_booking_id uuid)
returns void as $$
begin
  update bookings
  set balance = total_amount - coalesce(
    (select sum(amount) from payments where booking_id = p_booking_id), 0
  )
  where id = p_booking_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Recompute balance whenever the contract total changes
create or replace function trg_bookings_recalc_balance()
returns trigger as $$
begin
  new.balance := new.total_amount - coalesce(
    (select sum(amount) from payments where booking_id = new.id), 0
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger bookings_recalc_balance
before insert or update of total_amount on bookings
for each row execute function trg_bookings_recalc_balance();

-- Recompute balance whenever payments change
create or replace function trg_payments_recalc_balance()
returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    perform recalc_booking_balance(old.booking_id);
    return old;
  end if;

  perform recalc_booking_balance(new.booking_id);

  if (tg_op = 'UPDATE' and new.booking_id <> old.booking_id) then
    perform recalc_booking_balance(old.booking_id);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger payments_recalc_balance
after insert or update or delete on payments
for each row execute function trg_payments_recalc_balance();

-- ─────────────────────────────────────────────────────────────────────────
-- AR number generator: AR-YYYY-NNNN
-- ─────────────────────────────────────────────────────────────────────────

create or replace function generate_ar_number()
returns text as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq int;
begin
  select count(*) + 1 into v_seq
  from payments
  where ar_number like 'AR-' || v_year || '-%';

  return 'AR-' || v_year || '-' || lpad(v_seq::text, 4, '0');
end;
$$ language plpgsql security definer set search_path = public;

-- ─────────────────────────────────────────────────────────────────────────
-- Payments: auto AR number + 5% credit card terminal fee
-- ─────────────────────────────────────────────────────────────────────────

create or replace function trg_payments_before_save()
returns trigger as $$
begin
  if new.payment_method = 'Credit Card' then
    new.credit_card_fee := round(new.amount * 0.05, 2);
  else
    new.credit_card_fee := 0;
  end if;

  if tg_op = 'INSERT' and (new.ar_number is null or new.ar_number = '') then
    new.ar_number := generate_ar_number();
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger payments_before_save
before insert or update on payments
for each row execute function trg_payments_before_save();

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-post a client timeline update whenever a payment is recorded
-- ─────────────────────────────────────────────────────────────────────────

create or replace function trg_payments_after_insert_timeline()
returns trigger as $$
begin
  insert into booking_updates (booking_id, update_type, message, created_by)
  values (
    new.booking_id,
    'payment_update',
    'A payment of ' || to_char(new.amount, 'FM₱999,999,990.00') || ' via ' || new.payment_method || ' was received. Thank you!',
    'System'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger payments_after_insert_timeline
after insert on payments
for each row execute function trg_payments_after_insert_timeline();
