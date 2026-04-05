import { createClient } from "@/lib/supabase/client";
import { Goal } from "@/types";

export const GOAL_BUCKET_MAP: Record<string, "reserva" | "empreendedor"> = {
  "Reserva de Emergência": "reserva",
  "Caixa Empreendedor": "empreendedor",
};

export const BUCKET_GOAL_MAP: Record<string, string> = {
  reserva: "Reserva de Emergência",
  empreendedor: "Caixa Empreendedor",
};

/**
 * Adjusts goal.current_amount by `delta` for the goal linked to `bucket`.
 * Positive delta = add (aporte), negative = remove (delete/edit).
 * No-op if the bucket isn't linked to a goal.
 */
export async function syncGoalForBucket(
  bucket: string,
  delta: number,
  goals: Goal[],
  updateGoal: (id: string, data: Partial<Goal>) => void,
): Promise<void> {
  const goalName = BUCKET_GOAL_MAP[bucket];
  if (!goalName) return;
  const goal = goals.find((g) => g.name === goalName);
  if (!goal) return;
  const newAmount = Math.max(0, goal.current_amount + delta);
  const supabase = createClient();
  const { error } = await supabase
    .from("goals")
    .update({ current_amount: newAmount, updated_at: new Date().toISOString() })
    .eq("id", goal.id);
  if (!error) updateGoal(goal.id, { current_amount: newAmount });
}

/** True when a transaction should be synced to a goal. */
export function isSavingsTx(bucket: string, type: string): boolean {
  return (bucket === "reserva" || bucket === "empreendedor") && type === "despesa";
}
