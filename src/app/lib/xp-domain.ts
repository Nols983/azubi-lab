export const XP_REWARDS = Object.freeze({
  lesson: 25,
  moduleQuiz: 100,
  challenge: 150,
  lab: 75,
  practiceQuiz: Object.freeze({
    below50: 20,
    from50: 40,
    from70: 60,
    from85: 80,
    from95: 100,
  }),
});

export const PRACTICE_QUIZ_DAILY_XP_LIMIT = 3;

export type LevelProgress = {
  totalXp: number;
  level: number;
  currentLevelStartXp: number;
  nextLevelXp: number;
  xpIntoCurrentLevel: number;
  xpRequiredForNextLevel: number;
  xpRemainingToNextLevel: number;
  progressPercentage: number;
};

export function getPracticeQuizXpReward(correctCount: number, questionCount: number) {
  assertQuizResult(correctCount, questionCount);
  const scaledCorrect = BigInt(correctCount) * BigInt(100);
  const scaledTotal = BigInt(questionCount);
  if (scaledCorrect < scaledTotal * BigInt(50)) return XP_REWARDS.practiceQuiz.below50;
  if (scaledCorrect < scaledTotal * BigInt(70)) return XP_REWARDS.practiceQuiz.from50;
  if (scaledCorrect < scaledTotal * BigInt(85)) return XP_REWARDS.practiceQuiz.from70;
  if (scaledCorrect < scaledTotal * BigInt(95)) return XP_REWARDS.practiceQuiz.from85;
  return XP_REWARDS.practiceQuiz.from95;
}

export function getXpThresholdForLevel(level: number) {
  if (!Number.isSafeInteger(level) || level < 1) throw new RangeError("Level must be a positive safe integer.");
  return toSafeNumber(levelThreshold(BigInt(level)));
}

export function deriveLevelProgress(totalXp: number): LevelProgress {
  if (!Number.isSafeInteger(totalXp) || totalXp < 0) throw new RangeError("Total XP must be a non-negative safe integer.");
  const xp = BigInt(totalXp);
  let lower = 1;
  let upper = 2;
  while (levelThreshold(BigInt(upper)) <= xp) {
    lower = upper;
    upper *= 2;
    if (!Number.isSafeInteger(upper)) throw new RangeError("Level exceeds the supported safe range.");
  }
  while (upper - lower > 1) {
    const middle = Math.floor((lower + upper) / 2);
    if (levelThreshold(BigInt(middle)) <= xp) lower = middle;
    else upper = middle;
  }

  const currentLevelStartXp = toSafeNumber(levelThreshold(BigInt(lower)));
  const nextLevelXp = toSafeNumber(levelThreshold(BigInt(lower + 1)));
  const xpIntoCurrentLevel = totalXp - currentLevelStartXp;
  const xpRequiredForNextLevel = nextLevelXp - currentLevelStartXp;
  const xpRemainingToNextLevel = nextLevelXp - totalXp;
  return {
    totalXp,
    level: lower,
    currentLevelStartXp,
    nextLevelXp,
    xpIntoCurrentLevel,
    xpRequiredForNextLevel,
    xpRemainingToNextLevel,
    progressPercentage: Math.round((xpIntoCurrentLevel / xpRequiredForNextLevel) * 100),
  };
}

function levelThreshold(level: bigint) {
  return BigInt(25) * (level - BigInt(1)) * (level + BigInt(2));
}

function toSafeNumber(value: bigint) {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("XP threshold exceeds the supported safe range.");
  return Number(value);
}

function assertQuizResult(correctCount: number, questionCount: number) {
  if (!Number.isSafeInteger(questionCount) || questionCount < 1
    || !Number.isSafeInteger(correctCount) || correctCount < 0 || correctCount > questionCount) {
    throw new RangeError("Practice quiz result is invalid.");
  }
}
