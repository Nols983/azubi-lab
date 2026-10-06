import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveLevelProgress,
  getPracticeQuizXpReward,
  getXpThresholdForLevel,
  PRACTICE_QUIZ_DAILY_XP_LIMIT,
  XP_REWARDS,
} from "../src/app/lib/xp-domain.ts";

test("canonical XP rewards and practice daily limit are exact", () => {
  assert.equal(XP_REWARDS.lesson, 25);
  assert.equal(XP_REWARDS.moduleQuiz, 100);
  assert.equal(XP_REWARDS.challenge, 150);
  assert.deepEqual(XP_REWARDS.practiceQuiz, {
    below50: 20,
    from50: 40,
    from70: 60,
    from85: 80,
    from95: 100,
  });
  assert.equal(PRACTICE_QUIZ_DAILY_XP_LIMIT, 3);
});

test("practice rewards use exact ratios instead of rounded percentages", () => {
  const currentQuestionCountCases = [
    [0, 20], [7, 20], [8, 40], [10, 40], [11, 60],
    [12, 60], [13, 80], [14, 80], [15, 100],
  ] as const;
  for (const [correct, reward] of currentQuestionCountCases) {
    assert.equal(getPracticeQuizXpReward(correct, 15), reward, `${correct}/15`);
  }
  assert.equal(getPracticeQuizXpReward(49, 100), 20);
  assert.equal(getPracticeQuizXpReward(50, 100), 40);
  assert.equal(getPracticeQuizXpReward(69, 100), 40);
  assert.equal(getPracticeQuizXpReward(70, 100), 60);
  assert.equal(getPracticeQuizXpReward(84, 100), 60);
  assert.equal(getPracticeQuizXpReward(85, 100), 80);
  assert.equal(getPracticeQuizXpReward(94, 100), 80);
  assert.equal(getPracticeQuizXpReward(95, 100), 100);
});

test("level thresholds follow the canonical cumulative curve", () => {
  const thresholds = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700];
  thresholds.forEach((threshold, index) => {
    assert.equal(getXpThresholdForLevel(index + 1), threshold);
    const at = deriveLevelProgress(threshold);
    assert.equal(at.level, index + 1);
    assert.equal(at.currentLevelStartXp, threshold);
    assert.equal(at.xpIntoCurrentLevel, 0);
    if (threshold > 0) assert.equal(deriveLevelProgress(threshold - 1).level, index);
    assert.equal(deriveLevelProgress(threshold + 1).level, index + 1);
  });
});

test("level progress exposes exact current and next-level values", () => {
  assert.deepEqual(deriveLevelProgress(1420), {
    totalXp: 1420,
    level: 7,
    currentLevelStartXp: 1350,
    nextLevelXp: 1750,
    xpIntoCurrentLevel: 70,
    xpRequiredForNextLevel: 400,
    xpRemainingToNextLevel: 330,
    progressPercentage: 18,
  });
  assert.equal(deriveLevelProgress(700).level, 5);
  assert.equal(deriveLevelProgress(699).level, 4);
  assert.throws(() => deriveLevelProgress(-1));
  assert.throws(() => getPracticeQuizXpReward(16, 15));
});
