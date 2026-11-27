import { formatCalendarDate, formatCount, pluralize } from "../shared/format.js";

// The sentences around it are English, so the names are joined as English
// joins them, whatever the locale writes numbers and dates as.
const nameList = new Intl.ListFormat("en-GB", { type: "conjunction" });

/**
 * Where the levels between the first and the last fall along the
 * collection's bar, which runs from no animals found to every one. The first
 * needs none and the last every one, so the bar's ends already mark them. A
 * model that knows no animals has only the first, so nothing is divided by
 * nothing.
 *
 * @param achievements as `getAchievements` gives them.
 * @returns how far along the bar each falls, from 0 to 1, from the first
 *   level marked.
 */
export function levelMarks({ levels, knownCount }) {
  return levels.slice(1, -1).map((level) => level.animalsNeeded / knownCount);
}

/**
 * The user's place among the levels, such as "Level 4 of 8".
 *
 * @param achievements as `getAchievements` gives them.
 */
export function describeLevelNumber({ level, levels }) {
  return `Level ${formatCount(level.number)} of ${formatCount(levels.length)}`;
}

/**
 * What the user has still to do to reach the next level, such as
 * "12 more animals to Ranger".
 *
 * @param achievements as `getAchievements` gives them.
 */
export function describeNextLevel({ nextLevel, foundCount }) {
  if (!nextLevel) {
    return "The highest level there is";
  }

  return `${pluralize(nextLevel.animalsNeeded - foundCount, "more animal")} to ${nextLevel.name}`;
}

/**
 * How many of the badges the user has earned, such as "3 of 8 earned".
 */
export function describeBadgeCount(badges) {
  const earned = badges.filter((badge) => badge.isEarned).length;
  return `${formatCount(earned)} of ${formatCount(badges.length)} earned`;
}

/**
 * Whether the user has earned a badge, and when, or how far they are towards
 * it, such as "Earned on 3 Oct 2026" or "4 of 10". A badge done only once
 * has no progress to tell between none and earned.
 *
 * @param badge one of the badges `getAchievements` gives.
 */
export function describeBadgeProgress(badge) {
  if (badge.isEarned) {
    return `Earned on ${formatCalendarDate(badge.dateEarned)}`;
  }

  return hasProgressToShow(badge)
    ? `${formatCount(badge.progress)} of ${formatCount(badge.goal)}`
    : "Not earned yet";
}

/**
 * Whether a badge is worth a bar of how far the user is towards it: one not
 * earned yet that takes more than once.
 */
export function hasProgressToShow({ isEarned, goal }) {
  return !isEarned && goal > 1;
}

/**
 * What a recognition earned the user, a sentence for the level and one for
 * the badges, such as "This took you up to level 2, Spotter." and "It earned
 * you the First find and Film-maker badges." They hold for as long as it
 * earns them, so they read the same when the recognition is looked at again.
 *
 * @param earned as `getRecognitionAchievements` gives it.
 * @returns the sentences, which are none when it earned nothing.
 */
export function describeEarned({ newLevel, newBadges }) {
  const sentences = [];

  if (newLevel) {
    sentences.push(`This took you up to level ${formatCount(newLevel.number)}, ${newLevel.name}.`);
  }

  if (newBadges.length > 0) {
    const names = nameList.format(newBadges.map((badge) => badge.name));
    const noun = newBadges.length === 1 ? "badge" : "badges";
    sentences.push(`${newLevel ? "It also" : "This"} earned you the ${names} ${noun}.`);
  }

  return sentences;
}
