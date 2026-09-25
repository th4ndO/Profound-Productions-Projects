alter table goals enable row level security;
alter table milestones enable row level security;
alter table tasks enable row level security;
alter table reminder_rules enable row level security;
alter table push_subscriptions enable row level security;
alter table profiles enable row level security;

-- goals: direct ownership
create policy goals_select on goals for select using (user_id = auth.uid());
create policy goals_insert on goals for insert with check (user_id = auth.uid());
create policy goals_update on goals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy goals_delete on goals for delete using (user_id = auth.uid());

-- milestones: ownership via parent goal
create policy milestones_select on milestones for select using (
  exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
);
create policy milestones_insert on milestones for insert with check (
  exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
);
create policy milestones_update on milestones for update using (
  exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
) with check (
  exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
);
create policy milestones_delete on milestones for delete using (
  exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = auth.uid())
);

-- tasks: ownership via milestone -> goal
create policy tasks_select on tasks for select using (
  exists (
    select 1 from milestones join goals on goals.id = milestones.goal_id
    where milestones.id = tasks.milestone_id and goals.user_id = auth.uid()
  )
);
create policy tasks_insert on tasks for insert with check (
  exists (
    select 1 from milestones join goals on goals.id = milestones.goal_id
    where milestones.id = tasks.milestone_id and goals.user_id = auth.uid()
  )
);
create policy tasks_update on tasks for update using (
  exists (
    select 1 from milestones join goals on goals.id = milestones.goal_id
    where milestones.id = tasks.milestone_id and goals.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from milestones join goals on goals.id = milestones.goal_id
    where milestones.id = tasks.milestone_id and goals.user_id = auth.uid()
  )
);
create policy tasks_delete on tasks for delete using (
  exists (
    select 1 from milestones join goals on goals.id = milestones.goal_id
    where milestones.id = tasks.milestone_id and goals.user_id = auth.uid()
  )
);

-- reminder_rules: direct ownership
create policy reminder_rules_select on reminder_rules for select using (user_id = auth.uid());
create policy reminder_rules_insert on reminder_rules for insert with check (user_id = auth.uid());
create policy reminder_rules_update on reminder_rules for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reminder_rules_delete on reminder_rules for delete using (user_id = auth.uid());

-- push_subscriptions: direct ownership
create policy push_subscriptions_select on push_subscriptions for select using (user_id = auth.uid());
create policy push_subscriptions_insert on push_subscriptions for insert with check (user_id = auth.uid());
create policy push_subscriptions_update on push_subscriptions for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_subscriptions_delete on push_subscriptions for delete using (user_id = auth.uid());

-- profiles: user_id is the primary key
create policy profiles_select on profiles for select using (user_id = auth.uid());
create policy profiles_insert on profiles for insert with check (user_id = auth.uid());
create policy profiles_update on profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy profiles_delete on profiles for delete using (user_id = auth.uid());
