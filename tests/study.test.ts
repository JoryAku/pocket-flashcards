import assert from "node:assert/strict";
import test from "node:test";
import {
  applyRetentionResult,
  completion,
  eligibleRecallTerms,
  makeCloze,
  makeTerm,
  migrateLegacyExamples,
  normalizeAnswer,
  retentionPercentage,
  safeSets,
  selectRecallTerms,
  stageFor,
  seed,
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
  assert.equal(set.terms[0].retentionAttempts, 0);
  assert.equal(set.terms[0].retentionCorrect, 0);
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

test("built-in examples demonstrate real learning and mixed progress", () => {
  assert.equal(seed[0].title, "Plant vocabulary");
  assert.equal(seed[0].lifetimePoints, 200);
  assert.deepEqual(
    seed[0].terms.map(
      ({ flashcardExposures, wordBankRounds, reviewRounds }) => [
        flashcardExposures,
        wordBankRounds,
        reviewRounds,
      ],
    ),
    [
      [0, 0, 0],
      [2, 0, 0],
      [4, 0, 0],
      [4, 1, 0],
      [4, 3, 1],
      [4, 3, 3],
    ],
  );
  assert.equal(
    seed[1].title,
    "Ngā mata o te maramataka — Ngāti Kahungunu sequence",
  );
  assert.equal(seed[1].terms.length, 30);
  assert.deepEqual(
    seed[1].terms.slice(0, 3).map(({ term, description }) => [
      term,
      description,
    ]),
    [
      ["Whiro", "1"],
      ["Tirea", "2"],
      ["Hoata", "3"],
    ],
  );
});

test("legacy samples are replaced without removing custom sets", () => {
  const custom = { ...makeSet(), id: "custom", title: "My own set" };
  const legacy = {
    ...makeSet(),
    id: "spanish",
    title: "Spanish essentials",
    terms: [
      makeTerm("la ventana", "window"),
      makeTerm("el jardín", "garden"),
      makeTerm("la llave", "key"),
      makeTerm("despacio", "slowly"),
    ],
  };
  const migrated = migrateLegacyExamples([legacy, custom]);
  assert.deepEqual(
    migrated.map(({ title }) => title),
    [
      "Plant vocabulary",
      "Ngā mata o te maramataka — Ngāti Kahungunu sequence",
      "My own set",
    ],
  );
});

test("recall tests choose up to five unique flashcard-ready terms", () => {
  const first = makeSet();
  first.id = "first";
  first.terms = Array.from({ length: 4 }, (_, index) => ({
    ...makeTerm(`Ready ${index}`, `${index}`),
    id: `ready-${index}`,
    flashcardExposures: 4,
  }));
  const second = makeSet();
  second.id = "second";
  second.terms = [
    { ...makeTerm("Ready 4", "4"), id: "ready-4", flashcardExposures: 4 },
    { ...makeTerm("Ready 5", "5"), id: "ready-5", flashcardExposures: 4 },
    { ...makeTerm("Not ready", "6"), id: "not-ready", flashcardExposures: 3 },
  ];

  assert.equal(eligibleRecallTerms([first, second]).length, 6);
  const selected = selectRecallTerms([first, second], 5, () => 0.25);
  assert.equal(selected.length, 5);
  assert.equal(new Set(selected.map(({ termId }) => termId)).size, 5);
  assert.ok(selected.every(({ termId }) => termId !== "not-ready"));
});

test("retention results stay separate from learning progress and score", () => {
  const set = makeSet();
  set.terms[0] = {
    ...set.terms[0],
    points: 25,
    flashcardExposures: 4,
    wordBankRounds: 2,
  };
  set.lifetimePoints = 25;

  const afterCorrect = applyRetentionResult(
    [set],
    { setId: set.id, termId: set.terms[0].id, correct: true },
    "2026-02-01T00:00:00.000Z",
  );
  const afterIncorrect = applyRetentionResult(
    afterCorrect,
    { setId: set.id, termId: set.terms[0].id, correct: false },
    "2026-02-02T00:00:00.000Z",
  );
  const term = afterIncorrect[0].terms[0];

  assert.equal(term.retentionAttempts, 2);
  assert.equal(term.retentionCorrect, 1);
  assert.equal(retentionPercentage(term), 50);
  assert.equal(term.lastTestedAt, "2026-02-02T00:00:00.000Z");
  assert.equal(term.points, 25);
  assert.equal(term.flashcardExposures, 4);
  assert.equal(term.wordBankRounds, 2);
  assert.equal(afterIncorrect[0].lifetimePoints, 25);
});
