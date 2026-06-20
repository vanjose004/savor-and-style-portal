-- Savor and Style Catering Services — Payment deletion syncs accounting tracker
-- Deleting a payment removes the matching income row in transactions

alter table payments
  add column if not exists transaction_id uuid references transactions(id) on delete set null;

-- payments_after_insert_sync_accounting (trg_payments_sync_to_accounting) already
-- creates the income row in transactions on payment insert. Extend it to capture
-- the new transaction's id so deletion below can match exactly instead of by
-- booking_ref + amount.
create or replace function trg_payments_sync_to_accounting()
returns trigger as $$
declare
  v_client_name text;
  v_booking_code text;
  v_category text;
  v_transaction_id uuid;
begin
  select c.name, b.booking_code
  into v_client_name, v_booking_code
  from bookings b
  join clients c on c.id = b.client_id
  where b.id = new.booking_id;

  v_category := case new.payment_type
    when 'reservation_fee' then 'reservation_fee'
    when 'downpayment' then 'downpayment'
    when 'balance' then 'balance'
    when 'partial' then 'balance'
    else 'other_income'
  end;

  insert into transactions (
    category, amount, booking_ref, client_name, payment_method, transaction_date, notes
  ) values (
    v_category,
    new.amount,
    v_booking_code,
    coalesce(v_client_name, 'Unknown Client'),
    new.payment_method,
    new.paid_at::date,
    'Auto-synced from portal — ' || coalesce(v_booking_code, new.booking_id::text)
  )
  returning id into v_transaction_id;

  update payments set transaction_id = v_transaction_id where id = new.id;

  return new;
exception when others then
  raise warning 'accounting sync failed for payment %: %', new.id, sqlerrm;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function trg_payments_after_delete_remove_income()
returns trigger as $$
declare
  v_booking_ref text;
begin
  if old.transaction_id is not null then
    delete from transactions where id = old.transaction_id;
    return old;
  end if;

  -- Fallback match by booking_ref + amount when no exact transaction_id was stored.
  -- Note: if this delete is itself a cascade from `delete from bookings ...`,
  -- the parent bookings row is already gone by the time this fires, so the
  -- lookup below returns no ref and the income row is left untouched.
  select booking_code into v_booking_ref from bookings where id = old.booking_id;

  if v_booking_ref is not null then
    delete from transactions
    where id = (
      select id from transactions
      where type = 'income'
        and booking_ref = v_booking_ref
        and amount = old.amount
      order by created_at desc
      limit 1
    );
  end if;

  return old;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists payments_after_delete_remove_income on payments;

create trigger payments_after_delete_remove_income
after delete on payments
for each row execute function trg_payments_after_delete_remove_income();
