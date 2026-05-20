-- Trading AI — chat conversations between the user and Claude about a
-- position. Each conversation is scoped to one position; messages are
-- ordered by created_at and carry either a user prompt or an assistant
-- reply. Claude fetches market data through tools, so we don't store any
-- context here besides the raw transcript.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.chat_role as enum ('user', 'assistant');

-- ---------------------------------------------------------------------------
-- chat_conversations: one thread, attached to a position.
-- ---------------------------------------------------------------------------
create table public.chat_conversations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  position_id  uuid not null references public.positions (id) on delete cascade,
  title        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index chat_conversations_user_id_idx
  on public.chat_conversations (user_id, updated_at desc);
create index chat_conversations_position_id_idx
  on public.chat_conversations (position_id);

create trigger chat_conversations_set_updated_at
  before update on public.chat_conversations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- chat_messages: a single turn in the conversation.
-- ---------------------------------------------------------------------------
create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  role            public.chat_role not null,
  content         text not null,
  created_at      timestamptz not null default now()
);

create index chat_messages_conversation_id_idx
  on public.chat_messages (conversation_id, created_at asc);

-- ---------------------------------------------------------------------------
-- Row Level Security: a user only sees their own conversations and the
-- messages of those conversations.
-- ---------------------------------------------------------------------------
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

create policy "Users manage their own chat conversations"
  on public.chat_conversations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read their own chat messages"
  on public.chat_messages for select
  using (
    exists (
      select 1
      from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users insert messages in their own conversations"
  on public.chat_messages for insert
  with check (
    exists (
      select 1
      from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

create policy "Users delete messages in their own conversations"
  on public.chat_messages for delete
  using (
    exists (
      select 1
      from public.chat_conversations c
      where c.id = chat_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );
