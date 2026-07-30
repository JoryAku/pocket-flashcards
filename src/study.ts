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
  | { kind: "study"; id: string; stage: "flash" | "bank" | "review" };

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
});

export const seed: StudySet[] = [
  {
    id: "spanish",
    title: "Spanish essentials",
    lifetimePoints: 230,
    wordBankUnlocked: true,
    reviewUnlocked: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    terms: [
      {
        ...makeTerm("la ventana", "window"),
        flashcardExposures: 4,
        wordBankRounds: 3,
        reviewRounds: 2,
        points: 70,
        attempts: 5,
        correct: 5,
        streak: 5,
        bestStreak: 5,
      },
      {
        ...makeTerm("el jardín", "garden"),
        flashcardExposures: 4,
        wordBankRounds: 3,
        reviewRounds: 1,
        points: 60,
        attempts: 4,
        correct: 4,
        streak: 4,
        bestStreak: 4,
      },
      {
        ...makeTerm("la llave", "key"),
        flashcardExposures: 4,
        wordBankRounds: 3,
        points: 50,
        attempts: 3,
        correct: 3,
        streak: 3,
        bestStreak: 3,
      },
      {
        ...makeTerm("despacio", "slowly"),
        flashcardExposures: 4,
        wordBankRounds: 3,
        points: 50,
        attempts: 3,
        correct: 3,
        streak: 3,
        bestStreak: 3,
      },
    ],
  },
  {
    id: "botany",
    title: "Backyard botany",
    lifetimePoints: 0,
    wordBankUnlocked: false,
    reviewUnlocked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    terms: [
      makeTerm("Petiole", "The stalk joining a leaf to a stem"),
      makeTerm("Sepal", "A leaf-like part protecting a flower bud"),
      makeTerm("Rhizome", "A horizontal underground plant stem"),
    ],
  },
];

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
    let terms = imported.terms.map((candidateTerm) => {
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
      };
    });

    const isOldSpanishExample =
      imported.title === "Spanish essentials" &&
      terms.map((term) => term.term).join("|") ===
        "la ventana|el jardín|la llave|despacio" &&
      terms
        .map(
          (term) =>
            `${term.flashcardExposures}-${term.wordBankRounds}-${term.reviewRounds}`,
        )
        .join("|") === "4-3-2|4-2-0|0-0-0|0-0-0";
    if (isOldSpanishExample) {
      terms = seed[0].terms.map((term) => ({ ...term, id: uid() }));
    }

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
