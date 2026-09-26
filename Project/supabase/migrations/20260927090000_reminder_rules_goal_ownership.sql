-- reminder_rules: require that the caller owns the referenced goal.
--
-- Why: the insert/update policies only checked user_id = auth.uid(), so a
-- user could create (or repoint) a rule whose goal_id is someone else's
-- goal. They cannot read that goal directly, but:
--   * the send-reminders Edge Function runs as service_role and puts the
--     goal's title into the push notification, which leaked another user's
--     goal title to the attacker's device;
--   * the victim deleting their goal cascaded into the attacker's rule.
--
-- Fix: INSERT and UPDATE with check now also require an owned goal (the same
-- pattern milestones uses). auth.uid() stays wrapped in (select ...) so it is
-- evaluated once per statement (advisor lint 0003_auth_rls_initplan).
--
-- SELECT and DELETE are unchanged (user_id = auth.uid()). Once writes are
-- gated, no rule can point at a foreign goal, and goals.user_id cannot be
-- handed to another user (goals_update with check), so the extra join would
-- add cost without closing anything. UPDATE's USING clause is unchanged for
-- the same reason.
--
-- Pre-check (production, 2026-09-26, read-only): 0 existing reminder_rules
-- rows reference a goal owned by a different user, so no rows need cleanup.

alter policy reminder_rules_insert on reminder_rules
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from goals
      where goals.id = reminder_rules.goal_id
        and goals.user_id = (select auth.uid())
    )
  );

alter policy reminder_rules_update on reminder_rules
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from goals
      where goals.id = reminder_rules.goal_id
        and goals.user_id = (select auth.uid())
    )
  );
