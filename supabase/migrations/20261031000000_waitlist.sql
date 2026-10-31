-- Season 0 waitlist.
-- RLS is on with no policies: anon/authenticated keys can read or write nothing.
-- All access goes through the API using the service role.

create table public.waitlist_entries (
  id            uuid primary key default gen_random_uuid(),
  x_handle      text not null unique check (x_handle ~ '^[a-z0-9_]{1,15}$'),  -- lowercased, without "@"
  x_avatar_url  text,
  wallet        text not null unique check (wallet ~ '^0x[a-f0-9]{40}$'),   -- lowercased EVM address
  tasks         jsonb not null default '{}',   -- {follow:{go_at,done_at}, like:…, comment:…, repost:…}
  spot_number   integer generated always as identity,  -- internal only; never exposed publicly
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now()
);

alter table public.waitlist_entries enable row level security;

-- Task timers before signup. A handle has no waitlist row until it submits a wallet,
-- so GO/CONFIRM progress lives here and is copied into waitlist_entries.tasks on join.
create table public.task_progress (
  handle      text not null check (handle ~ '^[a-z0-9_]{1,15}$'),
  task        text not null check (task in ('follow', 'like', 'comment', 'repost')),
  go_at       timestamptz not null,
  done_at     timestamptz,
  primary key (handle, task),
  check (done_at is null or done_at >= go_at)
);

alter table public.task_progress enable row level security;

revoke all on public.waitlist_entries, public.task_progress from anon, authenticated;

-- Generated share cards. Public read so the PNGs can be served and cached;
-- writes only via the service role.
insert into storage.buckets (id, name, public)
values ('cards', 'cards', true)
on conflict (id) do nothing;
