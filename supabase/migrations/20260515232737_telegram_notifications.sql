-- Trading AI — Telegram notification settings
-- One row per user, holding the Telegram chat the alerts are pushed to.

create table public.notification_settings (
  user_id             uuid primary key references auth.users (id) on delete cascade,
  telegram_chat_id    text,
  telegram_username   text,
  -- One-time code the user echoes to the bot to prove ownership of a chat.
  telegram_link_code  text,
  telegram_linked_at  timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

alter table public.notification_settings enable row level security;

create policy "Users manage their own notification settings"
  on public.notification_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
