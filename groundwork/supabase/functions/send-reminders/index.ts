// Groundwork — send-reminders Edge Function (Phase 5).
//
// Invoked every 5 minutes by a pg_cron job (see the
// schedule_send_reminders_cron migration) via pg_net, with the project's
// anon key as the bearer token (this function has verify_jwt enabled, and
// the anon key is already public — see src/lib/supabase/config.ts).
//
// For each enabled reminder_rules row whose day-of-week and local_time
// (evaluated in the rule's own IANA timezone) fall in the current 5-minute
// window, and that hasn't already sent today, and that doesn't fall inside
// the user's quiet hours: sends a Web Push notification to every device
// the user has subscribed, then stamps last_sent_at so it won't repeat.
//
// The VAPID private key never leaves Supabase: it's read from Vault over a
// direct Postgres connection (SUPABASE_DB_URL, auto-provided to every Edge
// Function), not passed through PostgREST/RLS.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@3";
import webpush from "npm:web-push@3";

const WINDOW_MINUTES = 5;
const DEFAULT_QUIET_START = "21:30";
const DEFAULT_QUIET_END = "07:00";

interface LocalParts {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday, matches reminder_rules.days_of_week
  hour: number;
  minute: number;
  dateKey: string; // "YYYY-MM-DD" in that timezone, for same-day dedup
}

function localParts(timezone: string, date: Date): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    dayOfWeek: dayNames.indexOf(parts.weekday),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

interface ReminderRuleRow {
  id: string;
  user_id: string;
  goal_id: string;
  days_of_week: number[];
  local_time: string;
  timezone: string;
  last_sent_at: string | null;
  goal_title: string;
}

function isDueNow(rule: ReminderRuleRow, now: Date): boolean {
  const local = localParts(rule.timezone, now);
  if (!rule.days_of_week.includes(local.dayOfWeek)) return false;

  const nowMinutes = local.hour * 60 + local.minute;
  const ruleMinutes = parseHHMM(rule.local_time.slice(0, 5));
  const diff = nowMinutes - ruleMinutes;
  if (diff < 0 || diff >= WINDOW_MINUTES) return false;

  if (rule.last_sent_at) {
    const lastSent = localParts(rule.timezone, new Date(rule.last_sent_at));
    if (lastSent.dateKey === local.dateKey) return false; // already sent today
  }
  return true;
}

function isQuietNow(quietStart: string, quietEnd: string, timezone: string, now: Date): boolean {
  const local = localParts(timezone, now);
  const nowMinutes = local.hour * 60 + local.minute;
  const start = parseHHMM(quietStart.slice(0, 5));
  const end = parseHHMM(quietEnd.slice(0, 5));
  if (start === end) return false;
  if (start < end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end; // wraps midnight, e.g. 21:30 -> 07:00
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const sql = postgres(dbUrl);

  try {
    const [{ decrypted_secret: vapidPrivateKey }] = await sql`
      select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key'
    `;
    const [{ decrypted_secret: vapidPublicKey }] = await sql`
      select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'
    `;
    webpush.setVapidDetails("mailto:groundwork-reminders@example.invalid", vapidPublicKey, vapidPrivateKey);

    const now = new Date();

    const { data: rules, error: rulesError } = await admin
      .from("reminder_rules")
      .select("id, user_id, goal_id, days_of_week, local_time, timezone, last_sent_at, goals(title)")
      .eq("enabled", true);
    if (rulesError) throw rulesError;

    let sentCount = 0;
    const errors: string[] = [];

    for (const row of rules ?? []) {
      const rule: ReminderRuleRow = {
        id: row.id,
        user_id: row.user_id,
        goal_id: row.goal_id,
        days_of_week: row.days_of_week,
        local_time: row.local_time,
        timezone: row.timezone,
        last_sent_at: row.last_sent_at,
        goal_title: (row.goals as unknown as { title: string } | null)?.title ?? "your goal",
      };

      if (!isDueNow(rule, now)) continue;

      const { data: profile } = await admin
        .from("profiles")
        .select("quiet_start, quiet_end")
        .eq("user_id", rule.user_id)
        .maybeSingle();
      const quietStart = profile?.quiet_start ?? DEFAULT_QUIET_START;
      const quietEnd = profile?.quiet_end ?? DEFAULT_QUIET_END;
      if (isQuietNow(quietStart, quietEnd, rule.timezone, now)) continue;

      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", rule.user_id);
      if (!subs || subs.length === 0) continue;

      const payload = JSON.stringify({
        title: "Groundwork",
        body: `Time to work on: ${rule.goal_title}`,
        url: `/goals/${rule.goal_id}`,
      });

      let sentToAny = false;
      for (const sub of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          sentToAny = true;
        } catch (err) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", sub.id);
          } else {
            errors.push(`sub ${sub.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }

      if (sentToAny) {
        await admin.from("reminder_rules").update({ last_sent_at: now.toISOString() }).eq("id", rule.id);
        sentCount++;
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, errors }), {
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    await sql.end();
  }
});
