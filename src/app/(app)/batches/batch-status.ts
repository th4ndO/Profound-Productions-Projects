/**
 * Batch status constants shared between ./actions.ts (a "use server" file,
 * whose every export must be an async function — so this plain constant
 * data and helper live here instead) and the detail page that renders the
 * available transition buttons.
 */
export const BATCH_STATUSES = ["PLANNED", "IN_PRODUCTION", "COMPLETED", "COSTED", "CANCELLED"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

/** Legal forward transitions. COSTED and CANCELLED are terminal. */
export const ALLOWED_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  PLANNED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["COSTED"],
  COSTED: [],
  CANCELLED: [],
};

/** The statuses a batch currently in `status` may legally move to next. */
export function allowedNextStatuses(status: string): BatchStatus[] {
  return ALLOWED_TRANSITIONS[status as BatchStatus] ?? [];
}
