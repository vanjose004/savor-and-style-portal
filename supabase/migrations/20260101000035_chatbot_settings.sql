-- Chatbot Settings — single-row config for Stella, the floating chat widget
-- on / and /landing. Admin-editable via /admin/chatbot-settings.
--
-- Two different readers, two different access levels:
-- - api/chat.js reads the FULL row (including system_prompt/model/
--   max_tokens) using the Supabase service-role key, bypassing RLS —
--   same pattern as the Telegram bot's privileged reads.
-- - The public widget itself only needs display fields (bot_name,
--   greeting_message, is_enabled) to render before a message is even
--   sent, exposed via a narrow SECURITY DEFINER RPC rather than a direct
--   anon SELECT grant — system_prompt/model/max_tokens are never sent to
--   the browser.
--
-- Singleton enforced at the DB level: `id boolean primary key default
-- true` plus `check (id)` means at most one row can ever exist (a second
-- row would need id = false, which the check rejects) — a common Postgres
-- trick for "exactly one row" config tables.

create table if not exists chatbot_settings (
  id boolean primary key default true,
  bot_name text not null default 'Stella',
  greeting_message text not null default 'Kumusta! 👋 Ako si Stella, ang virtual assistant ng Savor and Style Catering Services. Tanong lang tungkol sa packages, pricing, soft reserve, o kahit ano about sa amin!',
  system_prompt text not null default '',
  is_enabled boolean not null default true,
  model text not null default 'gpt-4o-mini',
  max_tokens integer not null default 500 check (max_tokens > 0 and max_tokens <= 4000),
  updated_at timestamptz not null default now(),
  constraint chatbot_settings_singleton check (id)
);

insert into chatbot_settings (id) values (true) on conflict (id) do nothing;

alter table chatbot_settings enable row level security;

drop policy if exists "admins manage chatbot_settings" on chatbot_settings;
create policy "admins manage chatbot_settings" on chatbot_settings
  for all using (is_admin()) with check (is_admin());

create or replace function get_chatbot_public_settings()
returns table (bot_name text, greeting_message text, is_enabled boolean) as $$
  select chatbot_settings.bot_name, chatbot_settings.greeting_message, chatbot_settings.is_enabled
  from chatbot_settings
  where id = true;
$$ language sql security definer stable set search_path = public;

grant execute on function get_chatbot_public_settings() to anon, authenticated;
