import { createElement } from "../shared/dom.js";
import { describeLevelNumber, describeNextLevel, levelMarks } from "./achievement-text.js";

/**
 * Shows the user's level along the collection's bar, as the levels count the
 * same animals: a mark on the bar where each level falls, and under it the
 * level the user is at and what the next one needs.
 *
 * @param slot the element the level is written in.
 * @param track the bar's track, which the marks are drawn on.
 * @param achievements as `getAchievements` gives them.
 */
export function renderLevelSummary(slot, track, achievements) {
  track.querySelectorAll(".collection-progress__mark").forEach((mark) => mark.remove());
  track.append(...levelMarks(achievements).map(createMark));

  const current = createElement("p", "level-summary__current");
  current.append(
    createElement("span", "level-summary__number", describeLevelNumber(achievements)),
    " ",
    createElement("strong", "level-summary__name", achievements.level.name),
  );

  slot.replaceChildren(current, createElement("p", "level-summary__next", describeNextLevel(achievements)));
}

function createMark({ fraction, isReached }) {
  const mark = createElement(
    "span",
    isReached ? "collection-progress__mark is-reached" : "collection-progress__mark",
  );
  mark.style.left = `${fraction * 100}%`;
  return mark;
}
