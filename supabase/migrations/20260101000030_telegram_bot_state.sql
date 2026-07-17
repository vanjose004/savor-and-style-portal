-- Telegram bot conversation state.
--
-- Vercel serverless functions (api/telegram-webhook.js) share no memory
-- between invocations, so multi-step bot flows (booking disambiguation,
-- payment method/type prompts, expense category picker) need durable
-- state to resume across messages/button taps. Inline-keyboard
-- callback_data is limited to 64 bytes, so buttons only carry a
-- reference to a row here (e.g. "st:confirm:<id>"), never the full
-- pending action.
--
-- Lifecycle: created when the bot asks a clarifying question; updated in
-- place for multi-step flows; deleted on resolution (confirm/cancel) or
-- superseded by a fresh command. Opportunistically swept per-chat on
-- every incoming update rather than a global cron job — fine at
-- single-admin volume.

create table if not exists telegram_bot_state (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null,
  pending_action jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists idx_telegram_bot_state_chat_id on telegram_bot_state (chat_id);

-- Written only by the bot's Vercel functions using the Supabase service
-- role key (bypasses RLS entirely, same pattern as the existing Edge
-- Functions) — RLS is enabled with no policies as defense in depth, so
-- no anon/authenticated client can ever read or write bot state.
alter table telegram_bot_state enable row level security;
