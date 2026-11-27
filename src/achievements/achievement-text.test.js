import { describe, expect, it } from "vitest";
import {
  describeBadgeCount,
  describeBadgeProgress,
  describeEarned,
  describeLevelNumber,
  describeNextLevel,
  hasProgressToShow,
  levelMarks,
} from "./achievement-text.js";

const level = (number, name, animalsNeeded, isReached = false) => ({
  number,
  name,
  animalsNeeded,
  isReached,
  dateReached: null,
});

const levels = [
  level(1, "Newcomer", 0, true),
  level(2, "Spotter", 3, true),
  level(3, "Explorer", 10),
  level(4, "Master of the Wild", 20),
];

const badge = (overrides) => ({
  id: "teacher",
  name: "Teacher",
  description: "Tell us whether the model was right 10 times.",
  goal: 10,
  progress: 4,
  isEarned: false,
  dateEarned: null,
  ...overrides,
});

describe("levelMarks", () => {
  it("places the levels between the first and the last along the bar", () => {
    expect(levelMarks({ levels, knownCount: 20 })).toEqual([0.15, 0.5]);
  });

  it("marks nothing when the first and the last are the only levels", () => {
    expect(levelMarks({ levels: [levels[0], levels[3]], knownCount: 20 })).toEqual([]);
  });

  // Rather than dividing by nothing.
  it("marks nothing when the model knows no animals", () => {
    expect(levelMarks({ levels: [levels[0]], knownCount: 0 })).toEqual([]);
  });
});

describe("describeLevelNumber", () => {
  it("says which of the levels the user is at", () => {
    expect(describeLevelNumber({ level: levels[1], levels })).toBe("Level 2 of 4");
  });
});

describe("describeNextLevel", () => {
  it("says how many more animals the next level needs", () => {
    expect(describeNextLevel({ nextLevel: levels[2], foundCount: 4 })).toBe("6 more animals to Explorer");
  });

  it("counts a single animal as one", () => {
    expect(describeNextLevel({ nextLevel: levels[2], foundCount: 9 })).toBe("1 more animal to Explorer");
  });

  it("says when there is no level left to reach", () => {
    expect(describeNextLevel({ nextLevel: null, foundCount: 20 })).toBe("The highest level there is");
  });
});

describe("describeBadgeCount", () => {
  it("counts the badges earned out of all of them", () => {
    expect(describeBadgeCount([badge({ isEarned: true }), badge(), badge()])).toBe("1 of 3 earned");
  });
});

describe("describeBadgeProgress", () => {
  it("says when an earned badge was earned", () => {
    expect(describeBadgeProgress(badge({ isEarned: true, dateEarned: "2026-10-03T12:00:00Z" }))).toMatch(
      /^Earned on .*2026/,
    );
  });

  it("counts how far the user is towards a badge done more than once", () => {
    expect(describeBadgeProgress(badge())).toBe("4 of 10");
  });

  it("only says a badge done once is not earned yet", () => {
    expect(describeBadgeProgress(badge({ goal: 1, progress: 0 }))).toBe("Not earned yet");
  });
});

describe("hasProgressToShow", () => {
  it.each([
    [{ isEarned: false, goal: 10 }, true],
    [{ isEarned: true, goal: 10 }, false],
    [{ isEarned: false, goal: 1 }, false],
  ])("for %o is %s", (badgeState, expected) => {
    expect(hasProgressToShow(badgeState)).toBe(expected);
  });
});

describe("describeEarned", () => {
  const firstFind = badge({ id: "first-find", name: "First find" });
  const filmMaker = badge({ id: "film-maker", name: "Film-maker" });
  const sharpEye = badge({ id: "sharp-eye", name: "Sharp eye" });

  it("says nothing of a recognition that earned nothing", () => {
    expect(describeEarned({ newLevel: null, newBadges: [] })).toEqual([]);
  });

  it("names the level a recognition took the user up to", () => {
    expect(describeEarned({ newLevel: levels[1], newBadges: [] })).toEqual([
      "This took you up to level 2, Spotter.",
    ]);
  });

  it("names the badge a recognition earned", () => {
    expect(describeEarned({ newLevel: null, newBadges: [firstFind] })).toEqual([
      "This earned you the First find badge.",
    ]);
  });

  it("names every badge a recognition earned, in their order", () => {
    expect(describeEarned({ newLevel: null, newBadges: [firstFind, filmMaker, sharpEye] })).toEqual([
      "This earned you the First find, Film-maker and Sharp eye badges.",
    ]);
  });

  it("names the level before the badges", () => {
    expect(describeEarned({ newLevel: levels[1], newBadges: [firstFind] })).toEqual([
      "This took you up to level 2, Spotter.",
      "It also earned you the First find badge.",
    ]);
  });
});
