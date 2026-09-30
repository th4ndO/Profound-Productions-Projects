"use client";

import { useState } from "react";
import Link from "next/link";
import { GoalVisual, THEMES, THEME_NAMES, THEME_HINTS, type Theme } from "@/components/visuals/GoalVisual";
import { TIMEFRAMES, TIMEFRAME_LABELS, DEFAULT_TIMEFRAME } from "@/lib/timeframe";
import { IDEAS } from "@/lib/ideas";
import { PLANS, matchPlans } from "@/lib/plans";
import { adoptIdea } from "../actions";
import styles from "./new-goal.module.css";

/**
 * New goal form. Mirrors reference/groundwork.html's `#newGoal` dialog
 * (title, visual picker, time frame, reward, milestones textarea) as a
 * full page instead of a <dialog> — the BUILD SPEC leaves that choice to
 * us. Submits via a native form `action` (the `createGoal` Server Action
 * passed in from the page), so it works without JS too; the theme picker
 * is the only bit of client interactivity needed to drive a hidden input.
 */
export function NewGoalForm({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [theme, setTheme] = useState<Theme>("tree");
  const [title, setTitle] = useState("");
  const suggestions = matchPlans(title)
    .map((id) => IDEAS.find((i) => i.id === id))
    .filter((i) => i !== undefined);

  return (
    <form action={action} className={styles.form}>
      <h1 className={styles.heading}>New goal</h1>

      <div className={styles.field}>
        <label htmlFor="title">What are you working toward?</label>
        <input
          id="title"
          name="title"
          required
          maxLength={80}
          placeholder="e.g. Run a half marathon"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {suggestions.length > 0 && (
        <section className={styles.planSuggest} aria-live="polite">
          <p className={styles.planSuggestTitle}>There&apos;s a step-by-step plan for this</p>
          {suggestions.map((idea) => {
            const plan = PLANS[idea.id];
            const steps = plan.milestones.reduce((n, m) => n + m.tasks.length, 0);
            return (
              <div key={idea.id} className={styles.planRow}>
                <div>
                  <strong>{idea.title}</strong>
                  <small>
                    {plan.milestones.length} milestones, {steps} small steps, with tips and where to find
                    help
                  </small>
                </div>
                <button type="submit" formAction={adoptIdea.bind(null, idea.id)} formNoValidate className={styles.btn}>
                  Use this plan
                </button>
              </div>
            );
          })}
        </section>
      )}

      <fieldset className={styles.field}>
        <legend>How should it grow?</legend>
        <input type="hidden" name="theme" value={theme} />
        <div className={styles.picker} role="group" aria-label="Visual style">
          {THEMES.map((t) => (
            <button
              type="button"
              key={t}
              className={styles.pick}
              aria-pressed={theme === t}
              onClick={() => setTheme(t)}
            >
              <GoalVisual theme={t} p={0.7} label={THEME_NAMES[t]} />
              {THEME_NAMES[t]}
              <small>{THEME_HINTS[t]}</small>
            </button>
          ))}
        </div>
      </fieldset>

      <div className={styles.field}>
        <label htmlFor="timeframe">Time frame</label>
        <select id="timeframe" name="timeframe" defaultValue={DEFAULT_TIMEFRAME}>
          {TIMEFRAMES.map((tf) => (
            <option key={tf} value={tf}>
              {TIMEFRAME_LABELS[tf]}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="reward">Reward when you finish</label>
        <input id="reward" name="reward" maxLength={120} placeholder="e.g. New running shoes" />
      </div>

      <div className={styles.field}>
        <label htmlFor="milestones">Milestones, one per line</label>
        <textarea
          id="milestones"
          name="milestones"
          placeholder={"Run 5 km without stopping\nRun 10 km\nRun 15 km\nRace day"}
        />
        <p className={styles.hint}>You can add tasks inside each milestone later.</p>
      </div>

      <div className={styles.row}>
        <Link href="/" className={styles.ghost}>
          Cancel
        </Link>
        <button type="submit" className={styles.btn}>
          Create goal
        </button>
      </div>
    </form>
  );
}
