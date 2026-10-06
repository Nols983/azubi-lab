export type ProjectActivity = {
  id: string;
  duration: number;
  predecessorIds: readonly string[];
};

export type ScheduledProjectActivity = ProjectActivity & {
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  totalFloat: number;
  critical: boolean;
};

export function calculateProjectNetwork(activities: readonly ProjectActivity[]) {
  if (activities.length === 0) throw new Error("Ein Netzplan benötigt mindestens einen Vorgang.");
  const byId = new Map<string, ProjectActivity>();
  for (const activity of activities) {
    if (!activity.id.trim() || byId.has(activity.id)) throw new Error("Vorgangs-IDs müssen eindeutig und nicht leer sein.");
    if (!Number.isFinite(activity.duration) || activity.duration < 0) throw new Error(`Ungültige Dauer für ${activity.id}.`);
    if (new Set(activity.predecessorIds).size !== activity.predecessorIds.length) throw new Error(`Doppelte Vorgänger für ${activity.id}.`);
    byId.set(activity.id, activity);
  }

  const successors = new Map(activities.map((activity) => [activity.id, [] as string[]]));
  const remainingPredecessors = new Map<string, number>();
  for (const activity of activities) {
    for (const predecessorId of activity.predecessorIds) {
      if (!byId.has(predecessorId)) throw new Error(`Unbekannter Vorgänger ${predecessorId} für ${activity.id}.`);
      if (predecessorId === activity.id) throw new Error(`Vorgang ${activity.id} darf nicht sein eigener Vorgänger sein.`);
      successors.get(predecessorId)!.push(activity.id);
    }
    remainingPredecessors.set(activity.id, activity.predecessorIds.length);
  }

  const queue = activities.filter((activity) => activity.predecessorIds.length === 0).map((activity) => activity.id);
  const orderedIds: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    orderedIds.push(id);
    for (const successorId of successors.get(id) ?? []) {
      const remaining = (remainingPredecessors.get(successorId) ?? 0) - 1;
      remainingPredecessors.set(successorId, remaining);
      if (remaining === 0) queue.push(successorId);
    }
  }
  if (orderedIds.length !== activities.length) throw new Error("Der Netzplan enthält einen Zyklus.");

  const forward = new Map<string, { earliestStart: number; earliestFinish: number }>();
  for (const id of orderedIds) {
    const activity = byId.get(id)!;
    const earliestStart = Math.max(0, ...activity.predecessorIds.map((predecessorId) => forward.get(predecessorId)!.earliestFinish));
    forward.set(id, { earliestStart, earliestFinish: earliestStart + activity.duration });
  }
  const projectDuration = Math.max(...[...forward.values()].map((times) => times.earliestFinish));

  const backward = new Map<string, { latestStart: number; latestFinish: number }>();
  for (const id of [...orderedIds].reverse()) {
    const activity = byId.get(id)!;
    const successorIds = successors.get(id) ?? [];
    const latestFinish = successorIds.length > 0
      ? Math.min(...successorIds.map((successorId) => backward.get(successorId)!.latestStart))
      : projectDuration;
    backward.set(id, { latestFinish, latestStart: latestFinish - activity.duration });
  }

  const scheduled: ScheduledProjectActivity[] = orderedIds.map((id) => {
    const activity = byId.get(id)!;
    const earliest = forward.get(id)!;
    const latest = backward.get(id)!;
    const totalFloat = latest.latestStart - earliest.earliestStart;
    return { ...activity, ...earliest, ...latest, totalFloat, critical: totalFloat === 0 };
  });
  return { projectDuration, activities: scheduled };
}
