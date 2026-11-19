import { isUuid } from "./account-security.ts";

export const TOPIC_PROPOSAL_STATUSES = ["submitted", "in-review", "accepted", "rejected"] as const;
export type TopicProposalStatus = (typeof TOPIC_PROPOSAL_STATUSES)[number];
export const TOPIC_PROPOSAL_STATUS_LABELS: Record<TopicProposalStatus, string> = {
  submitted: "Eingereicht",
  "in-review": "In Prüfung",
  accepted: "Angenommen",
  rejected: "Abgelehnt",
};
export type TopicProposalInput = {
  title: string;
  description: string;
  learningObjective: string;
  category: string;
  teamId: string;
};

export function validateTopicProposal(input: Record<keyof TopicProposalInput, unknown>) {
  const limits = { title: [3, 160], description: [10, 6000], learningObjective: [10, 3000], category: [2, 100] } as const;
  const value = {} as TopicProposalInput;
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const text = typeof input[key] === "string" ? input[key].trim() : "";
    if (text.length < limits[key][0] || text.length > limits[key][1]) return undefined;
    value[key] = text;
  }
  if (!isUuid(input.teamId)) return undefined;
  value.teamId = input.teamId;
  return value;
}

export function parseTopicProposalStatus(value: unknown): TopicProposalStatus | undefined {
  return TOPIC_PROPOSAL_STATUSES.includes(value as TopicProposalStatus) ? value as TopicProposalStatus : undefined;
}
