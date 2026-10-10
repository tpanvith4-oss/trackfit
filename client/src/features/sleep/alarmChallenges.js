export const MATH_PROBLEM_COUNT = 2;
export const SHAKE_TARGET = 30;

const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

function createAddition() {
  const a = randomInt(12, 49);
  const b = randomInt(12, 49);
  return { prompt: `${a} + ${b}`, answer: a + b };
}

function createMultiplication() {
  const a = randomInt(6, 14);
  const b = randomInt(3, 9);
  return { prompt: `${a} × ${b}`, answer: a * b };
}

/** One addition and one multiplication in random order: enough working memory to prove you're awake. */
export function createMathProblems() {
  const problems = [createAddition(), createMultiplication()];
  return Math.random() < 0.5 ? problems : problems.reverse();
}
