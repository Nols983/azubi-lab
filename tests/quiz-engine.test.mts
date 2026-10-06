import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { learningModules } from "../src/app/data/learning-modules.ts";
import {
  assessmentGroupIds,
  assessmentGroupLabels,
  assessmentModulesByGroup,
  getAssessmentGroupForModule,
  getAssessmentModulesForGroup,
  getQuizCategoryForModule,
  mixedAssessmentModuleSlugs,
  quizCategoryIds,
  quizCategoryLabels,
  quizModulesByCategory,
  type AssessmentGroupId,
} from "../src/app/data/quiz-bank/categories.ts";
import { moduleCompletionDefinitions } from "../src/app/data/quiz-bank/module-completion-definitions.ts";
import {
  practiceDifficultyQuota,
  practiceQuestionCount,
  practiceQuestionTypeQuota,
} from "../src/app/data/quiz-bank/practice-config.ts";
import {
  PracticeSelectionError,
  selectPracticeQuestions,
} from "../src/app/data/quiz-bank/practice-selection.ts";
import { projectPracticeQuestion } from "../src/app/data/quiz-bank/practice-projection.ts";
import { questionBank } from "../src/app/data/quiz-bank/question-bank.ts";
import { quizTagIds } from "../src/app/data/quiz-bank/tags.ts";
import type {
  ModuleCompletionDefinition,
  QuestionBankQuestion,
  Quiz,
} from "../src/app/data/quiz-bank/types.ts";
import {
  assertCompletionDefinitionsIntegrity,
  assertQuestionBankIntegrity,
  QuizBankIntegrityError,
} from "../src/app/data/quiz-bank/validation.ts";
import {
  activeDirectoryQuiz,
  backupQuiz,
  hardwareQuiz,
  privacyQuiz,
  programmingQuiz,
  modelingQuiz,
  projectManagementQuiz,
  economicsQuiz,
  softwareLicensingQuiz,
  virtualizationCloudQuiz,
  customerContractQuiz,
  clientInstallationQuiz,
  dataCalculationsQuiz,
  qualityHandoverQuiz,
  securityQuiz,
  storageRaidQuiz,
  dhcpQuiz,
  dnsQuiz,
  getQuizForModule,
  ipv4FundamentalsQuiz,
  linuxQuiz,
  networkTroubleshootingQuiz,
  networkDevicesQuiz,
  networkTopologiesQuiz,
  osiTcpIpQuiz,
  quizzes,
  subnettingQuiz,
  webserverQuiz,
  windowsQuiz,
} from "../src/app/data/quizzes.ts";
import { validateQuizAnswers } from "../src/app/lib/quiz-answer-validation.ts";
import { gradeQuiz, isAnswerCorrect } from "../src/app/lib/quiz-grading.ts";
import { prepareModuleQuizAttempt } from "../src/app/lib/module-quiz-attempt.ts";
import {
  createEmptyLearnerProgressState,
  getModuleProgress,
  recordQuizAttempt,
} from "../src/app/lib/learner-progress.ts";
import { canonicalizeLocalProgress } from "../src/app/lib/server/progress-import.ts";

const expectedQuizHashes = {
  "ipv4-grundlagen": "8c9bb7801d41cccbe03bb2137bf05ddf863634d64b55189a71a5872e99cba1c0",
  subnetting: "54f3662552ac724cd9159eddc24528b2989ba036e591c0daf4ef502d9781e121",
  dhcp: "8b109808d12e51efbca7d9ae4f75098d98e8d5da9d28b40f1b85a00b11cbbccc",
  dns: "4960e566714ea9d8f7647d836c6a72b37c4e77a2278e169feeabcd4da634be04",
  "webserver-grundlagen": "dcf8846890eca4677d47ddadb7cddaeac01d396519781bbe8e7a0dd5b49d7f0f",
  "linux-grundlagen": "ab9a2cdd8f6d13d0b31a7a0f0901704560018fa91aa836e244d25702e0c4034c",
  "windows-grundlagen": "8de5838e544556ab9e9c15e699048ea796f58ba48d8e44859b79876fe579d98c",
  "active-directory-grundlagen": "a8e49a57b673bdb83189b0ef67e2169e70dcf64c44248be88d89a538a647e8c5",
  "netzwerkfehler-systematisch-analysieren": "da572b84b746ab885233d10817296edd1d78ad735c039f78281f1fb552bd2542",
  "osi-tcp-ip-modell": "d1d80270b2794615892ebeb1b98d9ba32186dbde52295f1ed9441f4b8364a8f5",
  "netzwerk-koppelelemente": "afe0b121797ad760767c0f76c6390d6cfc2aa7b2e3fbcfbafd4f9dd812ab6786",
  netzwerktopologien: "322afbc8db2a267705d4aca67e5867bbb1db079325852f21f0548a6da98a4476",
  "backup-datensicherung": "005ffc95bb3140b66f9a86c88dbe8b3f5c8b6d774817fc0c2eadb4ef8323adde",
  "arbeitsplatz-hardware": "721f1e1029c0342593d792f6800d34bb4ff26bde13f0d9fc17872bef5e8cded3",
  "storage-und-raid": "28a35c603d21e00f35024bfb6f3c9dba28a70a456038d9fcc7e90fb1ff389c84",
  "it-sicherheit": "54e13a91a7ed1c22ef705a2b91fe2a7cb25892e9e295859c724bb07b63988967",
  datenschutz: "678e56b48fe9db2dbdf8088d10f7835d8733575ae79be1c7d6eaa0b65b8484e1",
  "programmierung-und-pseudocode": "f53b75fd4550d6c03c70e80ac03d56f116889ac15e37b8ff91f9caa39931c2fc",
  "uml-und-datenmodellierung": "872dc14e2b36076fb9b800dc97b1b4d571960c4614f710c5404b2b1307bbfba0",
  projektmanagement: "478b939198ffa78f0f41cb8a2890c8d2fdc027c5500762591a49d21b40c48855",
  "wirtschaftlichkeit-und-beschaffung": "b0ab5546625cc25447619d9b9a2616b07746842b2a98048f2229afcfb8a26f48",
  "software-und-lizenzierung": "13de224246d762ef472c49c2fb538639a6cc575502dc8ce7834a7596d0d81141",
  "virtualisierung-und-cloud": "4c9bd91c9d3fe1ce01e7ef3b0f9c714db57301437ca9caeef4e1a30e2f7ee5af",
  "kundenauftrag-kommunikation-und-vertraege": "bf507308ce68f8c24567786c2c9eb1233280662214b1fd839b281c57afefde4f",
  "qualitaetssicherung-und-uebergabe": "508b4e0a8cf3432efdce017255832e614c7e1801352f4f36144d5e8741afa35e",
  "datenmengen-zahlensysteme-uebertragungsrechnungen": "57faf7521b87df0c423b63e5e58b115d15bcc02262c3d6dc09e6fba19ca85194",
  "clientinstallation-boot-datentraeger": "f4a704d3ccfb3395e93dd64d95f0b80db7b7e393ae9c2ecc76fcdf50c91d626a",
} as const;

const legacyQuizModuleSlugs = new Set([
  "ipv4-grundlagen", "subnetting", "dhcp", "dns", "webserver-grundlagen",
  "linux-grundlagen", "windows-grundlagen", "active-directory-grundlagen",
  "netzwerkfehler-systematisch-analysieren",
]);

const canonicalizedLessonTitles = {
  "linux-grundlagen:linux-kernel-distro": "Linux verstehen: Kernel, Distributionen und Shell",
  "linux-grundlagen:linux-shell-terminal": "Linux verstehen: Kernel, Distributionen und Shell",
  "linux-grundlagen:linux-root-path": "Dateisystem, Pfade und Verzeichnisstruktur",
  "linux-grundlagen:linux-path-types": "Dateisystem, Pfade und Verzeichnisstruktur",
  "linux-grundlagen:linux-touch": "Dateien und Verzeichnisse verwalten",
  "linux-grundlagen:linux-file-actions": "Dateien und Verzeichnisse verwalten",
  "linux-grundlagen:linux-glob-file": "Dateien und Verzeichnisse verwalten",
  "linux-grundlagen:linux-644": "Benutzer, Gruppen und Berechtigungen",
  "linux-grundlagen:linux-directory-x": "Benutzer, Gruppen und Berechtigungen",
  "linux-grundlagen:linux-permission-policy": "Benutzer, Gruppen und Berechtigungen",
  "linux-grundlagen:linux-process-service": "Prozesse, Dienste und Paketverwaltung",
  "linux-grundlagen:linux-systemctl": "Prozesse, Dienste und Paketverwaltung",
  "linux-grundlagen:linux-packages": "Prozesse, Dienste und Paketverwaltung",
  "windows-grundlagen:windows-terminal": "Windows verstehen: Editionen, Architektur und Oberfläche",
  "windows-grundlagen:windows-uac": "Windows verstehen: Editionen, Architektur und Oberfläche",
  "active-directory-grundlagen:ad-structure": "Domänen, Gesamtstrukturen und Organisationseinheiten",
  "active-directory-grundlagen:ad-ou-group": "Domänen, Gesamtstrukturen und Organisationseinheiten",
  "active-directory-grundlagen:ad-gpo-definition": "Gruppenrichtlinien und zentrale Verwaltung",
  "active-directory-grundlagen:ad-gpo-context": "Gruppenrichtlinien und zentrale Verwaltung",
  "active-directory-grundlagen:ad-gpo-diagnosis": "Gruppenrichtlinien und zentrale Verwaltung",
} as const;

function hash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function semanticQuiz(quiz: Quiz) {
  return {
    id: quiz.id,
    moduleSlug: quiz.moduleSlug,
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions.map((question) => ({
      type: question.type,
      prompt: question.prompt,
      options: question.options,
      correct: question.type === "single-choice" ? [question.correctOptionId] : question.correctOptionIds,
      explanation: question.explanation,
    })),
  };
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1_664_525, state) + 1_013_904_223) >>> 0;
    return state / 2 ** 32;
  };
}

function categorySubsets() {
  const subsets: AssessmentGroupId[][] = [];
  for (let mask = 1; mask < 2 ** assessmentGroupIds.length; mask += 1) {
    subsets.push(assessmentGroupIds.filter((_, index) => Boolean(mask & (1 << index))));
  }
  return subsets;
}

function correctAnswers(quiz: Quiz) {
  return Object.fromEntries(quiz.questions.map((question) => [
    question.id,
    question.type === "single-choice" ? [question.correctOptionId] : [...question.correctOptionIds],
  ]));
}

function replaceBankQuestion(
  questionId: string,
  replace: (question: QuestionBankQuestion) => unknown,
) {
  return questionBank.map(
    (question) => question.id === questionId ? replace(question) : question,
  ) as unknown as readonly QuestionBankQuestion[];
}

function limitCategoryPracticeCapacity(
  categoryId: AssessmentGroupId,
  matches: (question: QuestionBankQuestion) => boolean,
  keep: number,
) {
  const categoryQuestions = questionBank.filter(
    (question) => question.practiceEligible && getAssessmentGroupForModule(question.moduleSlug) === categoryId,
  );
  const matchingQuestions = categoryQuestions.filter(matches);
  const nonMatchingQuestions = categoryQuestions.filter((question) => !matches(question));
  const retainedIds = new Set<string>();

  for (const [difficulty, quota] of Object.entries(practiceDifficultyQuota)) {
    const retainedOutsideTarget = nonMatchingQuestions.filter(
      (question) => question.difficulty === difficulty,
    ).length;
    const needed = Math.max(0, quota - retainedOutsideTarget);
    for (const question of matchingQuestions.filter(
      (candidate) => candidate.difficulty === difficulty,
    ).slice(0, needed)) {
      if (retainedIds.size < keep) retainedIds.add(question.id);
    }
  }

  for (const question of matchingQuestions) {
    if (retainedIds.size === keep) break;
    retainedIds.add(question.id);
  }

  assert.equal(retainedIds.size, keep);
  return questionBank.map((question) => {
    if (!question.practiceEligible || getAssessmentGroupForModule(question.moduleSlug) !== categoryId || !matches(question)) {
      return question;
    }
    return retainedIds.has(question.id)
      ? question
      : { ...question, practiceEligible: false };
  }) as readonly QuestionBankQuestion[];
}

function expectPracticeSelection(categoryIds: readonly AssessmentGroupId[], questions: readonly QuestionBankQuestion[]) {
  assert.equal(questions.length, practiceQuestionCount);
  assert.equal(new Set(questions.map((question) => question.id)).size, practiceQuestionCount);
  assert.ok(questions.every((question) => question.practiceEligible));
  assert.deepEqual(
    {
      easy: questions.filter((question) => question.difficulty === "easy").length,
      medium: questions.filter((question) => question.difficulty === "medium").length,
      hard: questions.filter((question) => question.difficulty === "hard").length,
    },
    practiceDifficultyQuota,
  );
  assert.deepEqual(
    {
      "single-choice": questions.filter((question) => question.type === "single-choice").length,
      "multiple-selection": questions.filter((question) => question.type === "multiple-selection").length,
    },
    practiceQuestionTypeQuota,
  );

  const categoryCounts = categoryIds.map((categoryId) => questions.filter(
    (question) => getAssessmentGroupForModule(question.moduleSlug) === categoryId,
  ).length);
  assert.ok(Math.max(...categoryCounts) - Math.min(...categoryCounts) <= 1);
  assert.equal(categoryCounts.reduce((total, count) => total + count, 0), practiceQuestionCount);
  assert.ok(questions.every(
    (question) => categoryIds.includes(getAssessmentGroupForModule(question.moduleSlug)),
  ));

  for (const categoryId of categoryIds) {
    const moduleCounts = getAssessmentModulesForGroup(categoryId).map((moduleSlug) =>
      questions.filter((question) => question.moduleSlug === moduleSlug).length);
    assert.ok(Math.max(...moduleCounts) - Math.min(...moduleCounts) <= 1);
    assert.equal(
      moduleCounts.reduce((total, count) => total + count, 0),
      questions.filter((question) => getAssessmentGroupForModule(question.moduleSlug) === categoryId).length,
    );
  }
}

test("quiz taxonomy is authoritative, complete, and stable", () => {
  assert.deepEqual(assessmentGroupIds, [
    "it-grundlagen-arbeitsplatz",
    "netzwerke",
    "systeme-storage-betrieb",
    "sicherheit-datenschutz",
    "entwicklung-planung-wirtschaft",
  ]);
  assert.deepEqual(assessmentGroupLabels, {
    "it-grundlagen-arbeitsplatz": "IT-Grundlagen & Arbeitsplatz",
    netzwerke: "Netzwerke",
    "systeme-storage-betrieb": "Systeme, Storage & Betrieb",
    "sicherheit-datenschutz": "Sicherheit & Datenschutz",
    "entwicklung-planung-wirtschaft": "Entwicklung, Planung & Wirtschaft",
  });
  assert.equal(mixedAssessmentModuleSlugs.length, 27);
  assert.deepEqual(new Set(mixedAssessmentModuleSlugs), new Set(learningModules.map((module) => module.slug)));
  assert.deepEqual(
    assessmentGroupIds.flatMap((groupId) => assessmentModulesByGroup[groupId]),
    mixedAssessmentModuleSlugs,
  );
  for (const groupId of assessmentGroupIds) {
    for (const moduleSlug of assessmentModulesByGroup[groupId]) {
      assert.equal(getAssessmentGroupForModule(moduleSlug), groupId);
    }
  }

  // Four v1 IDs remain available only for persisted historic attempts.
  assert.deepEqual(quizCategoryIds, ["netzwerke", "betriebssysteme", "server-dienste", "troubleshooting"]);
  assert.deepEqual(quizCategoryLabels, {
    netzwerke: "Netzwerke",
    betriebssysteme: "Betriebssysteme",
    "server-dienste": "Server & Dienste",
    troubleshooting: "Troubleshooting",
  });
  assert.deepEqual(quizModulesByCategory, {
    netzwerke: ["ipv4-grundlagen", "subnetting", "dhcp", "dns", "osi-tcp-ip-modell", "netzwerk-koppelelemente", "netzwerktopologien"],
    betriebssysteme: ["linux-grundlagen", "windows-grundlagen", "arbeitsplatz-hardware"],
    "server-dienste": ["webserver-grundlagen", "active-directory-grundlagen", "backup-datensicherung", "storage-und-raid", "it-sicherheit", "datenschutz"],
    troubleshooting: ["netzwerkfehler-systematisch-analysieren"],
  });
  for (const categoryId of quizCategoryIds) {
    for (const moduleSlug of quizModulesByCategory[categoryId]) {
      assert.equal(getQuizCategoryForModule(moduleSlug), categoryId);
    }
  }
});

test("question bank integrity covers all 363 questions and controlled metadata", () => {
  assert.doesNotThrow(() => assertQuestionBankIntegrity(questionBank));
  assert.equal(questionBank.length, 363);
  assert.equal(new Set(questionBank.map((question) => question.id)).size, 363);
  assert.equal(questionBank.filter((question) => question.type === "single-choice").length, 218);
  assert.equal(questionBank.filter((question) => question.type === "multiple-selection").length, 145);
  assert.ok(questionBank.every((question) => question.id.startsWith(`${question.moduleSlug}:`)));
  assert.ok(questionBank.every((question) => question.revision === 1));
  assert.equal(questionBank.filter((question) => question.practiceEligible).length, 363);
  assert.equal(questionBank.filter((question) => !question.practiceEligible).length, 0);
  assert.equal(new Set(questionBank.filter((question) => question.practiceEligible).map((question) => question.moduleSlug)).size, 27);
  assert.ok(questionBank.every((question) => question.completionEligible));
  assert.ok(questionBank.every((question) => question.shuffleOptions));
  assert.ok(questionBank.every((question) => question.tags.length >= 1 && question.tags.length <= 4));
  assert.ok(questionBank.every((question) => new Set(question.tags).size === question.tags.length));
  assert.deepEqual(
    [...new Set(questionBank.flatMap((question) => question.tags))].sort(),
    [...quizTagIds].sort(),
  );
  assert.notEqual(
    questionBank.find((question) => question.id === "ipv4-grundlagen:link-local"),
    undefined,
  );
  assert.notEqual(
    questionBank.find((question) => question.id === "dhcp:link-local"),
    undefined,
  );

  for (const question of questionBank) {
    const learningModule = learningModules.find((module) => module.slug === question.moduleSlug);
    const lesson = learningModule?.lessons?.find((candidate) => candidate.slug === question.lessonSlug);
    assert.equal(lesson?.status, "available");
    const optionIds = question.options.map((option) => option.id);
    assert.equal(new Set(optionIds).size, optionIds.length);
    const correctOptionIds = question.type === "single-choice"
      ? [question.correctOptionId]
      : question.correctOptionIds;
    assert.ok(correctOptionIds.length > 0);
    if (question.type === "multiple-selection") assert.ok(correctOptionIds.length >= 2);
    assert.ok(correctOptionIds.every((optionId) => optionIds.includes(optionId)));
  }
});

test("runtime integrity checks reject duplicate IDs, invalid lessons, and invalid answer keys", () => {
  assert.throws(
    () => assertQuestionBankIntegrity([...questionBank, questionBank[0]]),
    QuizBankIntegrityError,
  );

  const invalidLessonBank = questionBank.map((question) => question.id === questionBank[0].id
    ? { ...question, lessonSlug: "nicht-vorhanden" }
    : question) as readonly QuestionBankQuestion[];
  assert.throws(() => assertQuestionBankIntegrity(invalidLessonBank), QuizBankIntegrityError);

  const firstSingle = questionBank.find((question) => question.type === "single-choice");
  assert.ok(firstSingle);
  const invalidAnswerBank = questionBank.map((question) => question.id === firstSingle.id
    ? { ...firstSingle, correctOptionId: "nicht-vorhanden" }
    : question) as readonly QuestionBankQuestion[];
  assert.throws(() => assertQuestionBankIntegrity(invalidAnswerBank), QuizBankIntegrityError);
});

test("runtime integrity rejects underspecified multiple-selection answer keys", () => {
  const multipleSelection = questionBank.find((question) => question.type === "multiple-selection");
  assert.ok(multipleSelection);

  const noCorrectAnswers = replaceBankQuestion(multipleSelection.id, (question) => ({
    ...question,
    correctOptionIds: [],
  }));
  assert.throws(() => assertQuestionBankIntegrity(noCorrectAnswers), QuizBankIntegrityError);

  const oneCorrectAnswer = replaceBankQuestion(multipleSelection.id, (question) => ({
    ...question,
    correctOptionIds: [multipleSelection.correctOptionIds[0]],
  }));
  assert.throws(() => assertQuestionBankIntegrity(oneCorrectAnswer), QuizBankIntegrityError);
});

test("runtime integrity rejects unknown controlled metadata without incidental type errors", () => {
  const question = questionBank[0];
  const invalidValues = [
    { field: "type", value: "true-false" },
    { field: "difficulty", value: "expert" },
    { field: "practiceEligible", value: "yes" },
    { field: "completionEligible", value: 1 },
    { field: "shuffleOptions", value: null },
  ] as const;

  for (const { field, value } of invalidValues) {
    const invalidBank = replaceBankQuestion(question.id, (candidate) => ({
      ...candidate,
      [field]: value,
    }));
    assert.throws(() => assertQuestionBankIntegrity(invalidBank), QuizBankIntegrityError);
  }
});

test("runtime integrity rejects a known lesson while it is unavailable and restores curriculum state", () => {
  const question = questionBank[0];
  const learningModule = learningModules.find((candidate) => candidate.slug === question.moduleSlug);
  const lesson = learningModule?.lessons?.find((candidate) => candidate.slug === question.lessonSlug);
  assert.ok(lesson);
  const mutableLesson = lesson as { status: "available" | "planned" };
  const originalStatus = mutableLesson.status;

  try {
    mutableLesson.status = "planned";
    assert.throws(() => assertQuestionBankIntegrity(questionBank), QuizBankIntegrityError);
  } finally {
    mutableLesson.status = originalStatus;
  }

  assert.doesNotThrow(() => assertQuestionBankIntegrity(questionBank));
});

test("runtime integrity uses the exact authoritative practice quotas", () => {
  for (const [difficulty, quota] of Object.entries(practiceDifficultyQuota)) {
    const insufficientDifficulty = limitCategoryPracticeCapacity(
      "netzwerke",
      (question) => question.difficulty === difficulty,
      quota - 1,
    );
    assert.throws(
      () => assertQuestionBankIntegrity(insufficientDifficulty),
      (error) => error instanceof QuizBankIntegrityError
        && error.message.includes("Schwierigkeitskapazität"),
    );
  }

  for (const [type, quota] of Object.entries(practiceQuestionTypeQuota)) {
    const insufficientType = limitCategoryPracticeCapacity(
      "netzwerke",
      (question) => question.type === type,
      quota - 1,
    );
    assert.throws(
      () => assertQuestionBankIntegrity(insufficientType),
      (error) => error instanceof QuizBankIntegrityError
        && error.message.includes("Fragetypkapazität"),
    );
  }
});

test("completion definitions reference every eligible bank question exactly once", () => {
  assert.doesNotThrow(() => assertCompletionDefinitionsIntegrity(moduleCompletionDefinitions, questionBank));
  assert.equal(moduleCompletionDefinitions.length, 27);
  const referencedIds = moduleCompletionDefinitions.flatMap((definition) => definition.questionIds);
  assert.equal(referencedIds.length, 363);
  assert.equal(new Set(referencedIds).size, 363);
  assert.deepEqual(new Set(referencedIds), new Set(questionBank.map((question) => question.id)));

  const invalidDefinitions = moduleCompletionDefinitions.map((definition, index) => index === 0
    ? { ...definition, questionIds: [...definition.questionIds, definition.questionIds[0]] }
    : definition) as unknown as readonly ModuleCompletionDefinition[];
  assert.throws(
    () => assertCompletionDefinitionsIntegrity(invalidDefinitions, questionBank),
    QuizBankIntegrityError,
  );
});

test("hydrated completion quizzes preserve legacy semantics and include all canonical quizzes", () => {
  assert.equal(quizzes.length, 27);
  assert.deepEqual(quizzes, [
    ipv4FundamentalsQuiz,
    subnettingQuiz,
    dhcpQuiz,
    dnsQuiz,
    osiTcpIpQuiz,
    networkDevicesQuiz,
    networkTopologiesQuiz,
    webserverQuiz,
    linuxQuiz,
    windowsQuiz,
    activeDirectoryQuiz,
    backupQuiz,
    networkTroubleshootingQuiz,
    hardwareQuiz,
    storageRaidQuiz,
    securityQuiz,
    privacyQuiz,
    programmingQuiz,
    modelingQuiz,
    projectManagementQuiz,
    economicsQuiz,
    softwareLicensingQuiz,
    virtualizationCloudQuiz,
    customerContractQuiz,
    qualityHandoverQuiz,
    dataCalculationsQuiz,
    clientInstallationQuiz,
  ]);
  assert.equal(
    hash(quizzes.filter((quiz) => legacyQuizModuleSlugs.has(quiz.moduleSlug)).map(semanticQuiz)),
    "a0c9037aed49f3dcde5f23251564b7a077b1e886e704c8a9c32368895f25975e",
  );
  for (const quiz of quizzes) {
    assert.equal(hash(semanticQuiz(quiz)), expectedQuizHashes[quiz.moduleSlug as keyof typeof expectedQuizHashes]);
    assert.deepEqual(
      quiz.questions.map((question) => question.id),
      moduleCompletionDefinitions.find((definition) => definition.moduleSlug === quiz.moduleSlug)?.questionIds,
    );
  }
});
test("module completion attempts shuffle deterministically without changing quiz semantics", () => {
  const quiz = ipv4FundamentalsQuiz;
  const canonicalShape = quiz.questions.map((question) => ({
    id: question.id,
    optionIds: question.options.map((option) => option.id),
  }));
  const firstAttempt = prepareModuleQuizAttempt(quiz, 11);
  const repeatedAttempt = prepareModuleQuizAttempt(quiz, 11);
  const secondAttempt = prepareModuleQuizAttempt(quiz, 29);

  assert.deepEqual(firstAttempt, repeatedAttempt);
  assert.notDeepEqual(
    firstAttempt.questions.map((question) => question.id),
    secondAttempt.questions.map((question) => question.id),
  );
  assert.deepEqual(
    quiz.questions.map((question) => ({
      id: question.id,
      optionIds: question.options.map((option) => option.id),
    })),
    canonicalShape,
  );

  for (const attempt of [firstAttempt, secondAttempt]) {
    assert.equal(attempt.questions.length, quiz.questions.length);
    assert.equal(new Set(attempt.questions.map((question) => question.id)).size, quiz.questions.length);
    assert.deepEqual(
      attempt.questions.map((question) => question.id).sort(),
      quiz.questions.map((question) => question.id).sort(),
    );
    for (const originalQuestion of quiz.questions) {
      const presentedQuestion = attempt.questions.find((question) => question.id === originalQuestion.id);
      assert.ok(presentedQuestion);
      assert.equal(presentedQuestion.options.length, originalQuestion.options.length);
      assert.equal(new Set(presentedQuestion.options.map((option) => option.id)).size, originalQuestion.options.length);
      assert.deepEqual(
        presentedQuestion.options.map((option) => option.id).sort(),
        originalQuestion.options.map((option) => option.id).sort(),
      );
    }
  }

  assert.ok(quiz.questions.some((question) => {
    const firstOptions = firstAttempt.questions.find((candidate) => candidate.id === question.id)?.options;
    const secondOptions = secondAttempt.questions.find((candidate) => candidate.id === question.id)?.options;
    return firstOptions?.map((option) => option.id).join("|") !== secondOptions?.map((option) => option.id).join("|");
  }));

  const trackedQuestion = quiz.questions.find((question) => question.type === "single-choice");
  assert.ok(trackedQuestion);
  const correctPositions = Array.from({ length: 32 }, (_, index) => {
    const attemptQuestion = prepareModuleQuizAttempt(quiz, index + 1).questions.find(
      (question) => question.id === trackedQuestion.id,
    );
    assert.ok(attemptQuestion && attemptQuestion.type === "single-choice");
    return attemptQuestion.options.findIndex((option) => option.id === attemptQuestion.correctOptionId);
  });
  assert.ok(new Set(correctPositions).size > 1);
  assert.ok(correctPositions.some((position) => position > 0));

  const semanticAnswers = correctAnswers(quiz);
  for (const attempt of [firstAttempt, secondAttempt]) {
    assert.deepEqual(validateQuizAnswers(attempt, semanticAnswers), semanticAnswers);
    const grade = gradeQuiz(attempt, semanticAnswers);
    assert.equal(grade.correctCount, quiz.questions.length);
    assert.equal(grade.totalCount, quiz.questions.length);
    assert.equal(grade.percentage, 100);
    assert.ok(grade.results.every((result) => result.isCorrect));
  }
});

test("completion quiz UI creates one stable presentation snapshot per start or retry", async () => {
  const component = await readFile(
    new URL("../src/app/components/quiz/quiz-app.tsx", import.meta.url),
    "utf8",
  );
  assert.match(component, /const \[attemptQuiz, setAttemptQuiz\] = useState\(quiz\)/);
  assert.equal(component.match(/setAttemptQuiz\(createAttemptQuiz\(quiz\)\)/g)?.length, 2);
  assert.match(component, /gradeQuiz\(attemptQuiz, answers\)/);
  assert.match(component, /<QuizResult quiz=\{attemptQuiz\}/);
  assert.doesNotMatch(component, /sort\(\(\) => Math\.random\(\) - 0\.5\)/);
  assert.doesNotMatch(component, /value=\{option\.id\}/);
  assert.match(component, /<label key=\{option\.id\}[\s\S]*?<input[\s\S]*?<span className="min-w-0 break-words">\{option\.label\}<\/span>[\s\S]*?<\/label>/);
});

test("hydration resolves all lessons from canonical module data, including 20 normalized references", () => {
  assert.equal(Object.keys(canonicalizedLessonTitles).length, 20);
  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const bankQuestion = questionBank.find((candidate) => candidate.id === question.id);
      const learningModule = learningModules.find((candidate) => candidate.slug === bankQuestion?.moduleSlug);
      const lesson = learningModule?.lessons?.find((candidate) => candidate.slug === bankQuestion?.lessonSlug);
      assert.equal(question.lesson, lesson?.title);
    }
  }
  for (const [questionId, title] of Object.entries(canonicalizedLessonTitles)) {
    const question = quizzes.flatMap((quiz) => quiz.questions).find((candidate) => candidate.id === questionId);
    assert.equal(question?.lesson, title);
  }
});

test("practice projection strips correctness fields and explanations", () => {
  for (const question of questionBank) {
    const projection = projectPracticeQuestion(question);
    assert.equal(Object.hasOwn(projection, "correctOptionId"), false);
    assert.equal(Object.hasOwn(projection, "correctOptionIds"), false);
    assert.equal(Object.hasOwn(projection, "explanation"), false);
    assert.equal(projection.id, question.id);
    assert.deepEqual(projection.options, question.options);
  }
});

test("practice selector satisfies exact quotas for every curriculum-group subset and deterministic seeds", () => {
  const reachableModules = new Set<string>();
  assert.equal(practiceQuestionCount, 15);
  assert.deepEqual(practiceDifficultyQuota, { easy: 4, medium: 8, hard: 3 });
  assert.deepEqual(practiceQuestionTypeQuota, { "single-choice": 8, "multiple-selection": 7 });
  assert.equal(
    Object.values(practiceDifficultyQuota).reduce((total, count) => total + count, 0),
    practiceQuestionCount,
  );
  assert.equal(
    Object.values(practiceQuestionTypeQuota).reduce((total, count) => total + count, 0),
    practiceQuestionCount,
  );
  for (const categoryIds of categorySubsets()) {
    for (let seed = 1; seed <= 12; seed += 1) {
      const selected = selectPracticeQuestions(categoryIds, seededRandom(seed));
      selected.forEach((question) => reachableModules.add(question.moduleSlug));
      expectPracticeSelection(categoryIds, selected);
    }
  }

  const categories = ["netzwerke", "systeme-storage-betrieb"] as const;
  const first = selectPracticeQuestions(categories, seededRandom(23)).map((question) => question.id);
  const repeated = selectPracticeQuestions(categories, seededRandom(23)).map((question) => question.id);
  const different = selectPracticeQuestions(categories, seededRandom(24)).map((question) => question.id);
  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first, different);
  assert.deepEqual(reachableModules, new Set(mixedAssessmentModuleSlugs));
});

test("balanced remainder allocation varies by seed without mutating inputs or the bank", () => {
  const categories = Object.freeze(["netzwerke", "it-grundlagen-arbeitsplatz", "systeme-storage-betrieb"] as const);
  const categoriesBefore = [...categories];
  const bankBefore = questionBank.map((question) => question.id);
  const extraNetworkModules = new Set<string>();

  for (let seed = 1; seed <= 30; seed += 1) {
    const selectedCategories = selectPracticeQuestions(categories, seededRandom(seed));
    const categoryCounts = categories.map((categoryId) => ({
      categoryId,
      count: selectedCategories.filter(
        (question) => getAssessmentGroupForModule(question.moduleSlug) === categoryId,
      ).length,
    }));
    assert.deepEqual(categoryCounts.map(({ count }) => count).sort(), [5, 5, 5]);
    const selectedAllCategories = selectPracticeQuestions(assessmentGroupIds, seededRandom(seed));
    const allCategoryCounts = assessmentGroupIds.map((categoryId) => ({
      categoryId,
      count: selectedAllCategories.filter(
        (question) => getAssessmentGroupForModule(question.moduleSlug) === categoryId,
      ).length,
    }));
    assert.deepEqual(allCategoryCounts.map(({ count }) => count).sort(), [3, 3, 3, 3, 3]);

    const selectedNetwork = selectPracticeQuestions(["netzwerke"], seededRandom(seed));
    const moduleCounts = getAssessmentModulesForGroup("netzwerke").map((moduleSlug) => ({
      moduleSlug,
      count: selectedNetwork.filter((question) => question.moduleSlug === moduleSlug).length,
    }));
    assert.deepEqual(moduleCounts.map(({ count }) => count).sort(), [2, 2, 2, 2, 2, 2, 3]);
    for (const { moduleSlug, count } of moduleCounts) {
      if (count === 3) extraNetworkModules.add(moduleSlug);
    }
  }

  assert.ok(extraNetworkModules.size > 2);
  assert.deepEqual(categories, categoriesBefore);
  assert.deepEqual(questionBank.map((question) => question.id), bankBefore);
});

test("practice selector fails explicitly when the eligible pool cannot supply 15 questions", () => {
  const insufficientPool = questionBank.filter(
    (question) => question.moduleSlug === "ipv4-grundlagen",
  ).slice(0, practiceQuestionCount - 1);
  assert.throws(
    () => selectPracticeQuestions(["netzwerke"], seededRandom(1), insufficientPool),
    (error) => error instanceof PracticeSelectionError && error.code === "UNSATISFIABLE_SELECTION",
  );
});

test("filtered Practice falls back deterministically without leaking into another group", () => {
  const constrainedPool = questionBank
    .filter((question) => getAssessmentGroupForModule(question.moduleSlug) === "sicherheit-datenschutz")
    .map((question) => ({ ...question, difficulty: "medium" as const }));
  const first = selectPracticeQuestions(["sicherheit-datenschutz"], seededRandom(91), constrainedPool);
  const repeated = selectPracticeQuestions(["sicherheit-datenschutz"], seededRandom(91), constrainedPool);
  assert.deepEqual(repeated.map((question) => question.id), first.map((question) => question.id));
  assert.equal(first.length, 15);
  assert.equal(new Set(first.map((question) => question.id)).size, 15);
  assert.equal(first.every((question) =>
    getAssessmentGroupForModule(question.moduleSlug) === "sicherheit-datenschutz"), true);
  assert.equal(first.every((question) => question.difficulty === "medium"), true);
});

test("practice selector rejects malformed input and invalid random sources with typed errors", () => {
  const cases: Array<{ input: readonly unknown[]; code: PracticeSelectionError["code"] }> = [
    { input: [], code: "EMPTY_CATEGORY_SELECTION" },
    { input: ["it-grundlagen-arbeitsplatz", "netzwerke", "systeme-storage-betrieb", "sicherheit-datenschutz", "entwicklung-planung-wirtschaft", "extra"], code: "TOO_MANY_CATEGORIES" },
    { input: [42], code: "NON_STRING_CATEGORY" },
    { input: ["unbekannt"], code: "UNKNOWN_CATEGORY" },
    { input: ["netzwerke", "netzwerke"], code: "DUPLICATE_CATEGORY" },
  ];
  for (const { input, code } of cases) {
    assert.throws(
      () => selectPracticeQuestions(input, seededRandom(1)),
      (error) => error instanceof PracticeSelectionError && error.code === code,
    );
  }
  assert.throws(
    () => selectPracticeQuestions(null as unknown as readonly unknown[], seededRandom(1)),
    (error) => error instanceof PracticeSelectionError && error.code === "INVALID_CATEGORY_INPUT",
  );
  for (const random of [() => Number.NaN, () => -0.1, () => 1, () => { throw new Error("kaputt"); }]) {
    assert.throws(
      () => selectPracticeQuestions(["netzwerke"], random),
      (error) => error instanceof PracticeSelectionError && error.code === "INVALID_RANDOM_SOURCE",
    );
  }
});

test("grading and submission validation work with namespaced hydrated question IDs", () => {
  const quiz = getQuizForModule("ipv4-grundlagen");
  assert.ok(quiz);
  const answers = correctAnswers(quiz);
  assert.deepEqual(validateQuizAnswers(quiz, answers), answers);
  const perfectGrade = gradeQuiz(quiz, answers);
  assert.equal(perfectGrade.correctCount, quiz.questions.length);
  assert.equal(perfectGrade.totalCount, quiz.questions.length);
  assert.equal(perfectGrade.percentage, 100);

  const firstQuestion = quiz.questions[0];
  assert.equal(firstQuestion.type, "single-choice");
  if (firstQuestion.type !== "single-choice") throw new Error("Erste IPv4-Frage muss Single Choice sein.");
  const incorrectFirstOption = firstQuestion.options.find(
    (option) => option.id !== firstQuestion.correctOptionId,
  );
  assert.ok(incorrectFirstOption);
  const oneIncorrect = { ...answers, [firstQuestion.id]: [incorrectFirstOption.id] };
  assert.equal(gradeQuiz(quiz, oneIncorrect).correctCount, quiz.questions.length - 1);

  const multiple = quiz.questions.find((question) => question.type === "multiple-selection");
  assert.ok(multiple);
  assert.equal(isAnswerCorrect(multiple, [...multiple.correctOptionIds].reverse()), true);
  assert.equal(isAnswerCorrect(multiple, multiple.correctOptionIds.slice(0, -1)), false);
  const incorrectOption = multiple.options.find((option) => !multiple.correctOptionIds.includes(option.id));
  assert.ok(incorrectOption);
  assert.equal(isAnswerCorrect(multiple, [...multiple.correctOptionIds, incorrectOption.id]), false);

  const unanswered = { ...answers };
  delete unanswered[firstQuestion.id];
  assert.equal(validateQuizAnswers(quiz, unanswered), undefined);
  assert.equal(validateQuizAnswers(quiz, { ...answers, [firstQuestion.id]: [] }), undefined);
  const firstAnswer = answers[firstQuestion.id][0];
  assert.equal(
    validateQuizAnswers(quiz, { ...answers, [firstQuestion.id]: [firstAnswer, firstAnswer] }),
    undefined,
  );
  assert.equal(
    validateQuizAnswers(quiz, { ...answers, [firstQuestion.id]: ["unbekannte-option"] }),
    undefined,
  );
});

test("existing first-attempt progress semantics remain module-based after ID namespacing", () => {
  let state = createEmptyLearnerProgressState();
  for (const quiz of quizzes) {
    state = recordQuizAttempt(
      state,
      quiz.moduleSlug,
      quiz.questions.length,
      quiz.questions.length,
      "2026-08-28T10:00:00.000Z",
    );
  }
  assert.equal(Object.keys(state.quizzes).length, 27);
  for (const quiz of quizzes) {
    const entry = state.quizzes[quiz.moduleSlug];
    assert.equal(entry.attempts, 1);
    assert.equal(entry.latestTotal, quiz.questions.length);
    assert.equal(entry.bestPercentage, 100);
    const learningModule = learningModules.find((candidate) => candidate.slug === quiz.moduleSlug);
    assert.ok(learningModule);
    const summary = getModuleProgress(state, learningModule, true);
    assert.equal(summary.quizAttempted, true);
    assert.equal(summary.completedActivities, 1);
  }

  const imported = canonicalizeLocalProgress(state, new Date("2026-08-28T12:00:00.000Z"));
  assert.equal(imported.quizzes.length, 27);
  assert.deepEqual(
    imported.quizzes.map((entry) => entry.moduleSlug).sort(),
    quizzes.map((quiz) => quiz.moduleSlug).sort(),
  );
});
