import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildPracticeQuizSubmission,
  countAnsweredPracticeQuestions,
  getPracticeQuizDraftStorageKey,
  isPracticeQuizSubmissionReady,
  parsePracticeQuizDraft,
  serializePracticeQuizDraft,
} from "../src/app/lib/practice-quiz-draft.ts";
import type { InProgressPracticeAttemptView } from "../src/app/lib/practice-quiz-attempt.ts";
import { parsePracticeAttemptCreationRequest } from "../src/app/lib/server/practice-quiz-attempt-request.ts";

const attempt = createAttempt("00000000-0000-4000-8000-000000000301");

test("practice drafts are versioned and scoped to one attempt", () => {
  assert.equal(
    getPracticeQuizDraftStorageKey(attempt.id),
    `azubi-lab:practice-quiz:draft:v1:${attempt.id}`,
  );
  const otherAttempt = createAttempt("00000000-0000-4000-8000-000000000302");
  const raw = serializePracticeQuizDraft(attempt, { q1: ["q1-a"] }, 4);
  assert.deepEqual(parsePracticeQuizDraft(raw, otherAttempt), {
    answers: {},
    currentQuestionIndex: 0,
  });
});

test("malformed and untrusted draft values are safely discarded", () => {
  assert.deepEqual(parsePracticeQuizDraft("not-json", attempt).answers, {});
  assert.deepEqual(parsePracticeQuizDraft(JSON.stringify({ version: 1 }), attempt).answers, {});

  const restored = parsePracticeQuizDraft(JSON.stringify({
    version: 1,
    attemptId: attempt.id,
    currentQuestionIndex: 99,
    answers: {
      unknown: ["unknown-a"],
      q1: ["q1-a", "q1-a"],
      q2: ["q2-a", "unknown-option"],
      q3: ["q3-a", "q3-b"],
      q4: ["q4-a", "q4-b"],
    },
  }), attempt);

  assert.deepEqual(restored, {
    answers: { q4: ["q4-a", "q4-b"] },
    currentQuestionIndex: 0,
  });
});

test("valid radio and checkbox drafts drive answered count and exact submission readiness", () => {
  const partial = Object.fromEntries(attempt.questions.slice(0, 14).map((question) => [
    question.questionId,
    question.type === "single-choice"
      ? [`${question.questionId}-a`]
      : [`${question.questionId}-a`, `${question.questionId}-b`],
  ]));
  assert.equal(countAnsweredPracticeQuestions(attempt, partial), 14);
  assert.equal(isPracticeQuizSubmissionReady(attempt, partial), false);
  assert.equal(buildPracticeQuizSubmission(attempt, partial), undefined);

  const complete = {
    ...partial,
    q15: ["q15-a"],
  };
  assert.equal(countAnsweredPracticeQuestions(attempt, complete), 15);
  assert.equal(isPracticeQuizSubmissionReady(attempt, complete), true);
  assert.deepEqual(
    buildPracticeQuizSubmission(attempt, complete)?.map((answer) => answer.questionId),
    attempt.questions.map((question) => question.questionId),
  );
});

test("category selection remains validated by the server boundary", () => {
  assert.deepEqual(
    parsePracticeAttemptCreationRequest({ categoryIds: ["netzwerke", "systeme-storage-betrieb"] }),
    { categoryIds: ["netzwerke", "systeme-storage-betrieb"] },
  );
  for (const categoryIds of [[], ["unknown"], ["netzwerke", "netzwerke"]]) {
    assert.throws(() => parsePracticeAttemptCreationRequest({ categoryIds }));
  }
});

test("client and action boundaries do not import or accept protected grading authority", async () => {
  const [client, actions, attemptPage, selector] = await Promise.all([
    readFile("src/app/components/quiz/practice-quiz-attempt.tsx", "utf8"),
    readFile("src/app/actions/practice-quiz-actions.ts", "utf8"),
    readFile("src/app/quiz/[attemptId]/page.tsx", "utf8"),
    readFile("src/app/components/quiz/practice-category-selector.tsx", "utf8"),
  ]);
  for (const forbidden of ["question-bank", "gradingSnapshot", "correctOptionId:", "seed:", "userId:"]) {
    assert.equal(client.includes(forbidden), false, forbidden);
  }
  assert.match(actions, /completePracticeQuizAttempt\(input\)/);
  assert.match(actions, /createPracticeQuizAttempt\(\{ categoryIds: selectedCategoryIds \}\)/);
  assert.match(actions, /restartPracticeQuizAttempt\(completedAttemptId\)/);
  assert.doesNotMatch(actions, /input\.userId|input\.score|input\.isCorrect/);
  assert.match(attemptPage, /getPracticeQuizAttempt\(attemptId\)/);
  assert.equal(attemptPage.includes("findOwnedPracticeAttempt"), false);
  assert.match(selector, /name="categoryIds"/);
  assert.match(client, /localStorage\.removeItem/);
});

function createAttempt(id: string): InProgressPracticeAttemptView {
  return {
    id,
    status: "in_progress",
    selectedCategoryIds: ["netzwerke"],
    questionCount: 15,
    startedAt: "2026-08-30T10:00:00.000Z",
    questions: Array.from({ length: 15 }, (_, index) => {
      const number = index + 1;
      const type = number % 2 === 1 ? "single-choice" as const : "multiple-selection" as const;
      return {
        position: number,
        questionId: `q${number}`,
        revision: 1,
        type,
        prompt: `Frage ${number}`,
        moduleSlug: "ipv4-grundlagen",
        assessmentGroupId: "netzwerke",
        lessonSlug: "was-ist-eine-ip-adresse",
        tags: ["test"],
        difficulty: "easy" as const,
        options: [
          { id: `q${number}-a`, label: "Antwort A" },
          { id: `q${number}-b`, label: "Antwort B" },
          { id: `q${number}-c`, label: "Antwort C" },
        ],
      };
    }),
  };
}
