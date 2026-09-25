import { NewGoalForm } from "./NewGoalForm";
import { createGoal } from "../actions";
import styles from "./new-goal.module.css";

export const metadata = {
  title: "New goal — Groundwork",
};

export default function NewGoalPage() {
  return (
    <div className={styles.wrap}>
      <NewGoalForm action={createGoal} />
    </div>
  );
}
