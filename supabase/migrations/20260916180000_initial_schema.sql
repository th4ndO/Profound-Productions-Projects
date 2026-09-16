create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id text,
  title text not null check (char_length(title) <= 80),
  theme text not null check (theme in ('tree','strength','building','mountain','jar','shelf')),
  timeframe text check (timeframe in ('day','week','month','quarter','year')),
  reward text check (char_length(reward) <= 120),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, idea_id)
);

create table milestones (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  title text not null check (char_length(title) <= 100),
  position int not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones(id) on delete cascade,
  title text not null check (char_length(title) <= 100),
  position int not null,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table reminder_rules (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  days_of_week int[] not null,
  local_time time not null,
  timezone text not null default 'Africa/Johannesburg',
  enabled boolean not null default true,
  last_sent_at timestamptz
);

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'Africa/Johannesburg',
  quiet_start time not null default '21:30',
  quiet_end time not null default '07:00'
);

create index milestones_goal_id_idx on milestones(goal_id);
create index tasks_milestone_id_idx on tasks(milestone_id);
create index reminder_rules_goal_id_idx on reminder_rules(goal_id);
create index reminder_rules_user_id_idx on reminder_rules(user_id);
create index push_subscriptions_user_id_idx on push_subscriptions(user_id);
