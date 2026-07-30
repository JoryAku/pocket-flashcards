import assert from "node:assert/strict";
import test from "node:test";
import {
  completion,
  makeCloze,
  makeTerm,
  normalizeAnswer,
  safeSets,
  stageFor,
  type StudySet,
} from "../src/study.ts";

const makeSet = (): StudySet => ({
  id: "set",
  title: "Test set",
  terms: [makeTerm("Kupu", "Word")],
  lifetimePoints: 0,
  wordBankUnlocked: false,
  reviewUnlocked: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

test("completion gives each exercise one third of total mastery", () => {
  const term = makeTerm("Kupu", "Word");
  assert.equal(completion(term), 0);
  assert.equal(completion({ ...term, flashcardExposures: 4 }), 33);
  assert.equal(
    completion({ ...term, flashcardExposures: 4, wordBankRounds: 3 }),
    67,
  );
  assert.equal(
    completion({
      ...term,
      flashcardExposures: 4,
      wordBankRounds: 3,
      reviewRounds: 3,
    }),
    100,
  );
});

test("continue studying chooses the earliest unfinished stage", () => {
  const set = makeSet();
  assert.equal(stageFor(set), "flash");
  set.terms[0].flashcardExposures = 4;
  assert.equal(stageFor(set), "bank");
  set.terms[0].wordBankRounds = 3;
  assert.equal(stageFor(set), "review");
});

test("import validates the schema, clamps rounds, and recalculates score", () => {
  const [set] = safeSets({
    title: "Imported",
    lifetimePoints: 999,
    terms: [
      {
        term: "Marama",
        description: "Moon",
        points: 20,
        flashcardExposures: 99,
        wordBankRounds: 99,
        reviewRounds: 99,
      },
    ],
  });
  assert.equal(set.lifetimePoints, 20);
  assert.equal(set.terms[0].flashcardExposures, 4);
  assert.equal(set.terms[0].wordBankRounds, 3);
  assert.equal(set.terms[0].reviewRounds, 3);
  assert.throws(() => safeSets({ title: "Broken" }), /not a Pocket Flashcards/);
});

test("answer normalization handles whitespace, case, and Unicode", () => {
  assert.equal(normalizeAnswer("  MĀRAMA  "), normalizeAnswer("mārama"));
});

test("cloze generation hides the requested share of letters", () => {
  const first = makeCloze("abcdefghij", 0.15, "round-one");
  const second = makeCloze("abcdefghij", 0.5, "round-two");
  assert.equal(Array.from(first.missing).length, 2);
  assert.equal(Array.from(second.missing).length, 5);
});
