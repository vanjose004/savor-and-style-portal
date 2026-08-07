-- Facebook Messenger Bot — admin-configurable settings + conversation log,
-- mirroring chatbot_settings/get_chatbot_public_settings (migration 35) for
-- the website widget, but for the Messenger channel. Both channels share
-- the same pricing/knowledge-base prompt builder (api/_lib/chatKnowledge.js)
-- — only the persona text, transport (Send API vs HTTP response), and
-- settings source differ.
--
-- Singleton pattern for messenger_bot_settings matches chatbot_settings:
-- `id boolean primary key default true` + `check (id)` guarantees at most
-- one row can ever exist.

create table if not exists messenger_bot_settings (
  id boolean primary key default true,
  is_enabled boolean not null default true,
  system_prompt text not null default '',
  greeting_message text not null default 'Kumusta! 👋 Ako si Stella, ang virtual assistant ng Savor and Style Catering Services. Tanong lang tungkol sa packages, pricing, soft reserve, o kahit ano about sa amin!',
  updated_at timestamptz not null default now(),
  constraint messenger_bot_settings_singleton check (id)
);

insert into messenger_bot_settings (id) values (true) on conflict (id) do nothing;

alter table messenger_bot_settings enable row level security;

drop policy if exists "admins manage messenger_bot_settings" on messenger_bot_settings;
create policy "admins manage messenger_bot_settings" on messenger_bot_settings
  for all using (is_admin()) with check (is_admin());

-- Conversation log — written only by api/facebook-webhook.js using the
-- Supabase service-role key (bypasses RLS entirely), same pattern as
-- telegram_bot_state. RLS is enabled with only an admin SELECT policy so
-- the "Recent Conversations" panel on /admin/messenger-bot can read it
-- directly with the signed-in admin's own session — read-only by design,
-- nothing in the UI needs to write to this table.
create table if not exists messenger_conversations (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null unique,
  sender_name text,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_messenger_conversations_updated_at on messenger_conversations (updated_at desc);

alter table messenger_conversations enable row level security;

drop policy if exists "admins read messenger_conversations" on messenger_conversations;
create policy "admins read messenger_conversations" on messenger_conversations
  for select using (is_admin());
