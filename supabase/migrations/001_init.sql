create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  creator_id uuid not null references users(id) on delete restrict,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('admin', 'member')),
  status text not null check (status in ('active', 'left')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (group_id, user_id)
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  creator_id uuid not null references users(id) on delete restrict,
  payer_id uuid not null references users(id) on delete restrict,
  description text not null,
  total_amount_paise bigint not null check (total_amount_paise > 0),
  split_type text not null check (split_type in ('equal', 'percentage', 'share', 'unequal')),
  expense_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  allocated_amount_paise bigint not null check (allocated_amount_paise >= 0),
  input_value numeric,
  created_at timestamptz not null default now(),
  unique (expense_id, user_id)
);

create table if not exists settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  creator_id uuid not null references users(id) on delete restrict,
  payer_id uuid not null references users(id) on delete restrict,
  payee_id uuid not null references users(id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  settlement_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists balance_edges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  from_user_id uuid not null references users(id) on delete cascade,
  to_user_id uuid not null references users(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  source_type text not null check (source_type in ('expense', 'settlement')),
  source_id uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists expense_messages (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  sender_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists expense_thread_reads (
  expense_id uuid not null references expenses(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (expense_id, user_id)
);

create table if not exists activity_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  actor_id uuid not null references users(id) on delete cascade,
  type text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_group_members_group_id on group_members(group_id);
create index if not exists idx_expenses_group_id on expenses(group_id);
create index if not exists idx_expense_shares_expense_id on expense_shares(expense_id);
create index if not exists idx_settlements_group_id on settlements(group_id);
create index if not exists idx_balance_edges_group_id on balance_edges(group_id);
create index if not exists idx_activity_events_group_id on activity_events(group_id);
create index if not exists idx_messages_expense_id on expense_messages(expense_id);

alter publication supabase_realtime add table groups;
alter publication supabase_realtime add table group_members;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table expense_shares;
alter publication supabase_realtime add table settlements;
alter publication supabase_realtime add table balance_edges;
alter publication supabase_realtime add table expense_messages;
alter publication supabase_realtime add table expense_thread_reads;
alter publication supabase_realtime add table activity_events;
