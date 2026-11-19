import assert from "node:assert/strict";
import test from "node:test";
import { parseInitialTeamMemberships } from "../src/app/lib/team-domain.ts";
import { validateTopicProposal, parseTopicProposalStatus } from "../src/app/lib/topic-proposal-domain.ts";
import { hasCapability } from "../src/app/lib/authorization.ts";

const teamA = "00000000-0000-4000-8000-000000000001";
const teamB = "00000000-0000-4000-8000-000000000002";

test("initial team memberships support independent functions in multiple teams", () => {
  assert.deepEqual(parseInitialTeamMemberships([`${teamA}:manager`, `${teamB}:member`]), [
    { teamId: teamA, teamRole: "manager" }, { teamId: teamB, teamRole: "member" },
  ]);
  assert.deepEqual(parseInitialTeamMemberships([]), []);
  for (const values of [[`${teamA}:manager`, `${teamA}:member`], ["x:member"], [`${teamA}:admin`], [`${teamA}:member:extra`], [null]]) {
    assert.equal(parseInitialTeamMemberships(values), undefined);
  }
});

test("topic input validates all bounds and cannot inject a status or owner", () => {
  const input = { title: "  DNS testen  ", description: "DNS-Auflösung systematisch untersuchen.", learningObjective: "Die Azubis können DNS-Fehler eingrenzen.", category: "Netzwerk", teamId: teamA };
  assert.equal(validateTopicProposal(input)?.title, "DNS testen");
  for (const patch of [{ title: "x" }, { description: "kurz" }, { learningObjective: "" }, { category: "a" }, { teamId: "invalid" }, { title: "x".repeat(161) }, { description: "x".repeat(6001) }, { learningObjective: "x".repeat(3001) }, { category: "x".repeat(101) }]) {
    assert.equal(validateTopicProposal({ ...input, ...patch }), undefined);
  }
  for (const status of ["submitted", "in-review", "accepted", "rejected"]) assert.equal(parseTopicProposalStatus(status), status);
  for (const status of ["published", "admin", null, {}, undefined]) assert.equal(parseTopicProposalStatus(status), undefined);
});

test("only team leaders and administrators submit, only administrators review proposals", () => {
  for (const role of ["learner", "observer"] as const) {
    assert.equal(hasCapability(role, "submitTopicProposals"), false);
    assert.equal(hasCapability(role, "reviewTopicProposals"), false);
  }
  assert.equal(hasCapability("instructor", "submitTopicProposals"), true);
  assert.equal(hasCapability("instructor", "reviewTopicProposals"), false);
  assert.equal(hasCapability("admin", "submitTopicProposals"), true);
  assert.equal(hasCapability("admin", "reviewTopicProposals"), true);
});
