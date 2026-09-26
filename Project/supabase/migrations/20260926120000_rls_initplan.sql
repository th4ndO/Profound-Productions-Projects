-- Same policies as row_level_security, with auth.uid() wrapped in a
-- scalar subquery so Postgres evaluates it once per statement (an
-- initPlan) instead of once per row. Access rules are unchanged: every
-- predicate below is the original one with auth.uid() -> (select auth.uid()).
-- Fixes the Supabase performance advisor lint 0003_auth_rls_initplan.

-- goals
alter policy goals_select on goals using (user_id = (select auth.uid()));
alter policy goals_insert on goals with check (user_id = (select auth.uid()));
alter policy goals_update on goals using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy goals_delete on goals using (user_id = (select auth.uid()));

-- reminder_rules
alter policy reminder_rules_select on reminder_rules using (user_id = (select auth.uid()));
alter policy reminder_rules_insert on reminder_rules with check (user_id = (select auth.uid()));
alter policy reminder_rules_update on reminder_rules using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy reminder_rules_delete on reminder_rules using (user_id = (select auth.uid()));

-- push_subscriptions
alter policy push_subscriptions_select on push_subscriptions using (user_id = (select auth.uid()));
alter policy push_subscriptions_insert on push_subscriptions with check (user_id = (select auth.uid()));
alter policy push_subscriptions_update on push_subscriptions using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy push_subscriptions_delete on push_subscriptions using (user_id = (select auth.uid()));

-- profiles
alter policy profiles_select on profiles using (user_id = (select auth.uid()));
alter policy profiles_insert on profiles with check (user_id = (select auth.uid()));
alter policy profiles_update on profiles using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
alter policy profiles_delete on profiles using (user_id = (select auth.uid()));

-- milestones
alter policy milestones_select on milestones using (exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = (select auth.uid())));
alter policy milestones_insert on milestones with check (exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = (select auth.uid())));
alter policy milestones_update on milestones using (exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = (select auth.uid()))) with check (exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = (select auth.uid())));
alter policy milestones_delete on milestones using (exists (select 1 from goals where goals.id = milestones.goal_id and goals.user_id = (select auth.uid())));

-- tasks
alter policy tasks_select on tasks using (exists (select 1 from milestones join goals on goals.id = milestones.goal_id where milestones.id = tasks.milestone_id and goals.user_id = (select auth.uid())));
alter policy tasks_insert on tasks with check (exists (select 1 from milestones join goals on goals.id = milestones.goal_id where milestones.id = tasks.milestone_id and goals.user_id = (select auth.uid())));
alter policy tasks_update on tasks using (exists (select 1 from milestones join goals on goals.id = milestones.goal_id where milestones.id = tasks.milestone_id and goals.user_id = (select auth.uid()))) with check (exists (select 1 from milestones join goals on goals.id = milestones.goal_id where milestones.id = tasks.milestone_id and goals.user_id = (select auth.uid())));
alter policy tasks_delete on tasks using (exists (select 1 from milestones join goals on goals.id = milestones.goal_id where milestones.id = tasks.milestone_id and goals.user_id = (select auth.uid())));
