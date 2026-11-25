import { describeEarned } from "../achievements/achievement-text.js";
import { getRecognitionAchievements } from "../api/achievements.js";
import { createElement } from "../shared/dom.js";
import { svgIcon } from "../shared/icons.js";
import { COLLECTION_PAGE } from "../shared/pages.js";
import { userTimeZone } from "../shared/time-zone.js";
import { initRecognitionNote } from "./recognition-note.js";

// The collection page's badges, where every badge is shown.
const BADGES_LINK = `${COLLECTION_PAGE}#badges`;

/**
 * The line under a recognition's result that says what it earned the user: a
 * level they went up to, the badges it earned them, or nothing at all.
 *
 * @param slot the element the line is drawn in.
 * @returns `show(recognition)` and `hide()`, as `initRecognitionNote` gives.
 */
export function initAchievementNote(slot) {
  return initRecognitionNote(slot, {
    subject: "what the recognition earned",
    load: (recognitionId) => getRecognitionAchievements(recognitionId, userTimeZone()),
    build: createNote,
  });
}

function createNote(earned) {
  const sentences = describeEarned(earned);
  if (sentences.length === 0) {
    return [];
  }

  const icon = createElement("span", "achievement-note__icon");
  icon.innerHTML = svgIcon("award", "achievement-note__svg");

  const link = createElement("a", "", "See your badges");
  link.href = BADGES_LINK;

  const text = createElement("p", "achievement-note__text", sentences.join(" "));
  text.append(" ", link);

  const note = createElement("div", "achievement-note");
  note.append(icon, text);
  return [note];
}
