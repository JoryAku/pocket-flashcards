import maoriLanguageWeek from "./data/maori-language-week.json" with { type: "json" };

export type Term = {
  id: string;
  term: string;
  description: string;
  points: number;
  attempts: number;
  correct: number;
  streak: number;
  bestStreak: number;
  flashcardExposures: number;
  wordBankRounds: number;
  reviewRounds: number;
  retentionAttempts: number;
  retentionCorrect: number;
  lastTestedAt?: string;
};

export type StudySet = {
  id: string;
  title: string;
  terms: Term[];
  lifetimePoints: number;
  wordBankUnlocked: boolean;
  reviewUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type View =
  | { kind: "library" }
  | { kind: "set"; id: string }
  | { kind: "study"; id: string; stage: "flash" | "bank" | "review" }
  | { kind: "test" };

export type RecallTerm = {
  setId: string;
  setTitle: string;
  termId: string;
  term: string;
  description: string;
};

export type RetentionResult = {
  setId: string;
  termId: string;
  correct: boolean;
};

export const uid = () => crypto.randomUUID();

export const makeTerm = (term: string, description: string): Term => ({
  id: uid(),
  term,
  description,
  points: 0,
  attempts: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  flashcardExposures: 0,
  wordBankRounds: 0,
  reviewRounds: 0,
  retentionAttempts: 0,
  retentionCorrect: 0,
});

export const seed: StudySet[] = maoriLanguageWeek.map((set) => ({
  ...set,
  terms: set.terms.map((term) => ({
    ...makeTerm(term.term, term.description),
    ...term,
    retentionAttempts: 0,
    retentionCorrect: 0,
  })),
}));

const isLegacyExample = (set: StudySet) =>
  set.id === "plant-progress-example" ||
  set.id === "maramataka-ngati-kahungunu" ||
  (set.title === "Plant vocabulary" &&
    set.terms.slice(0, 3).map((term) => term.term).join("|") ===
      "Petiole|Sepal|Rhizome") ||
  (set.title === "Ngā mata o te maramataka — Ngāti Kahungunu sequence" &&
    set.terms.length === 30 &&
    set.terms.slice(0, 3).map((term) => term.term).join("|") ===
      "Whiro|Tirea|Hoata") ||
  (set.title === "Spanish essentials" &&
    set.terms.map((term) => term.term).join("|") ===
      "la ventana|el jardín|la llave|despacio") ||
  (set.title === "Backyard botany" &&
    set.terms
      .slice(0, 3)
      .map((term) => term.term)
      .join("|") === "Petiole|Sepal|Rhizome") ||
  (set.title === "Plant facts" &&
    set.terms.map((term) => term.term).join("|") ===
      "Petiole|Sepal|Rhizome|leaf");

export const migrateLegacyExamples = (sets: StudySet[]) => {
  if (!sets.some(isLegacyExample)) return sets;
  const customSets = sets.filter((set) => !isLegacyExample(set));
  const examples = seed
    .filter(
      (example) => !customSets.some((set) => set.title === example.title),
    )
    .map((set) => ({
      ...set,
      terms: set.terms.map((term) => ({ ...term })),
    }));
  return [...examples, ...customSets];
};

export const completion = (term: Term) =>
  Math.round(
    ((Math.min(term.flashcardExposures, 4) / 4 +
      Math.min(term.wordBankRounds, 3) / 3 +
      Math.min(term.reviewRounds, 3) / 3) /
      3) *
      100,
  );

export const completed = (set: StudySet) =>
  set.terms.filter((term) => completion(term) === 100).length;

export const retentionPercentage = (term: Term) =>
  term.retentionAttempts
    ? Math.round((term.retentionCorrect / term.retentionAttempts) * 100)
    : 0;

export const eligibleRecallTerms = (sets: StudySet[]): RecallTerm[] =>
  sets.flatMap((set) =>
    set.terms
      .filter((term) => term.flashcardExposures >= 4)
      .map((term) => ({
        setId: set.id,
        setTitle: set.title,
        termId: term.id,
        term: term.term,
        description: term.description,
      })),
  );

export const selectRecallTerms = (
  sets: StudySet[],
  limit = 5,
  random: () => number = Math.random,
) => {
  const terms = eligibleRecallTerms(sets);
  for (let index = terms.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [terms[index], terms[target]] = [terms[target], terms[index]];
  }
  return terms.slice(0, Math.max(0, limit));
};

export const applyRetentionResult = (
  sets: StudySet[],
  result: RetentionResult,
  testedAt = new Date().toISOString(),
) =>
  sets.map((set) =>
    set.id !== result.setId
      ? set
      : {
          ...set,
          updatedAt: testedAt,
          terms: set.terms.map((term) =>
            term.id !== result.termId
              ? term
              : {
                  ...term,
                  retentionAttempts: term.retentionAttempts + 1,
                  retentionCorrect:
                    term.retentionCorrect + (result.correct ? 1 : 0),
                  lastTestedAt: testedAt,
                },
          ),
        },
  );

export const stageFor = (set: StudySet): "flash" | "bank" | "review" =>
  set.terms.some((term) => term.flashcardExposures < 4)
    ? "flash"
    : set.terms.some((term) => term.wordBankRounds < 3)
      ? "bank"
      : "review";

export const normalizeAnswer = (value: string) =>
  value.normalize("NFC").trim().toLocaleLowerCase();

export const makeCloze = (value: string, fraction: number, seedValue: string) => {
  const characters = Array.from(value);
  const candidates = characters
    .map((character, index) => ({ character, index }))
    .filter(({ character }) => /[\p{L}\p{N}]/u.test(character));
  let state = Array.from(seedValue).reduce(
    (hash, character) => (hash * 31 + character.codePointAt(0)!) >>> 0,
    2166136261,
  );
  const shuffled = [...candidates].sort(() => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296 - 0.5;
  });
  const hidden = new Set(
    shuffled
      .slice(0, Math.max(1, Math.ceil(candidates.length * fraction)))
      .map(({ index }) => index),
  );
  return {
    masked: characters
      .map((character, index) => (hidden.has(index) ? "_" : character))
      .join(""),
    missing: characters
      .filter((_, index) => hidden.has(index))
      .join(""),
  };
};

export const makeLetterBank = (value: string, seedValue: string) => {
  const letters = Array.from(value).map((letter, index) => ({ letter, index }));
  let state = Array.from(seedValue).reduce(
    (hash, character) => (hash * 33 + character.codePointAt(0)!) >>> 0,
    5381,
  );
  for (let index = letters.length - 1; index > 0; index--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const target = Math.floor((state / 4294967296) * (index + 1));
    [letters[index], letters[target]] = [letters[target], letters[index]];
  }
  return letters;
};

export const safeSets = (value: unknown): StudySet[] => {
  const raw = Array.isArray(value) ? value : [value];
  if (!raw.length) throw new Error("No study sets found");

  return raw.map((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      throw new Error("That file is not a Pocket Flashcards backup");
    }
    const imported = candidate as Record<string, unknown>;
    if (typeof imported.title !== "string" || !Array.isArray(imported.terms)) {
      throw new Error("That file is not a Pocket Flashcards backup");
    }

    const now = new Date().toISOString();
    const terms = imported.terms.map((candidateTerm) => {
      const term =
        candidateTerm && typeof candidateTerm === "object"
          ? (candidateTerm as Record<string, unknown>)
          : {};
      return {
        ...makeTerm(String(term.term || ""), String(term.description || "")),
        points: Number(term.points) || 0,
        attempts: Number(term.attempts) || 0,
        correct: Number(term.correct) || 0,
        streak: Number(term.streak) || 0,
        bestStreak: Number(term.bestStreak) || 0,
        flashcardExposures: Math.min(4, Number(term.flashcardExposures) || 0),
        wordBankRounds: Math.min(3, Number(term.wordBankRounds) || 0),
        reviewRounds: Math.min(3, Number(term.reviewRounds) || 0),
        retentionAttempts: Math.max(
          0,
          Number(term.retentionAttempts) || 0,
        ),
        retentionCorrect: Math.max(0, Number(term.retentionCorrect) || 0),
        ...(typeof term.lastTestedAt === "string"
          ? { lastTestedAt: term.lastTestedAt }
          : {}),
      };
    });

    const allFlash =
      terms.length > 0 && terms.every((term) => term.flashcardExposures >= 4);
    const allBank =
      terms.length > 0 && terms.every((term) => term.wordBankRounds >= 3);

    return {
      id: uid(),
      title: imported.title.trim() || "Imported set",
      lifetimePoints: terms.reduce((sum, term) => sum + term.points, 0),
      wordBankUnlocked:
        Boolean(imported.wordBankUnlocked) ||
        allFlash ||
        terms.some(
          (term) => term.wordBankRounds > 0 || term.reviewRounds > 0,
        ),
      reviewUnlocked:
        Boolean(imported.reviewUnlocked) ||
        allBank ||
        terms.some((term) => term.reviewRounds > 0),
      createdAt:
        typeof imported.createdAt === "string" ? imported.createdAt : now,
      updatedAt: now,
      terms,
    };
  });
};
