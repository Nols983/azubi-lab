"use server";

import { revalidatePath } from "next/cache";
import { parseTopicProposalStatus, validateTopicProposal } from "../lib/topic-proposal-domain";
import { requireCapability } from "../lib/server/current-user";
import { createTopicProposal, reviewTopicProposal } from "../lib/server/topic-proposal-repository";

export type TopicProposalActionState = { status: "idle" | "success" | "error"; message: string };

export async function createTopicProposalAction(_state: TopicProposalActionState, data: FormData): Promise<TopicProposalActionState> {
  try {
    const actor = await requireCapability("submitTopicProposals");
    if (!hasOnlyFields(data, ["title", "description", "learningObjective", "category", "teamId"])) return invalid();
    const value = validateTopicProposal({ title: data.get("title"), description: data.get("description"), learningObjective: data.get("learningObjective"), category: data.get("category"), teamId: data.get("teamId") });
    if (!value) return invalid();
    await createTopicProposal(actor.id, value);
    revalidatePath("/admin/themenvorschlaege");
    return { status: "success", message: "Der Themenvorschlag wurde eingereicht." };
  } catch {
    return invalid();
  }
}

export async function reviewTopicProposalAction(proposalId: string, _state: TopicProposalActionState, data: FormData): Promise<TopicProposalActionState> {
  try {
    const actor = await requireCapability("reviewTopicProposals");
    if (!hasOnlyFields(data, ["status", "feedback"])) return invalid();
    const status = parseTopicProposalStatus(data.get("status"));
    const feedback = data.get("feedback");
    if (!status || typeof feedback !== "string") return invalid();
    await reviewTopicProposal(actor.id, proposalId, status, feedback);
    revalidatePath("/admin/themenvorschlaege");
    return { status: "success", message: "Status und Rückmeldung wurden gespeichert." };
  } catch {
    return invalid();
  }
}

function invalid(): TopicProposalActionState {
  return { status: "error", message: "Prüfe die Angaben und deine Berechtigung für diesen Vorschlag bzw. dieses aktive Team." };
}
function hasOnlyFields(data: FormData, allowed: readonly string[]) {
  return [...data.keys()].every((key) => allowed.includes(key) || key.startsWith("$ACTION_"));
}
