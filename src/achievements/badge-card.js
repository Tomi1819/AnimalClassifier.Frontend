import { createElement } from "../shared/dom.js";
import { svgIcon } from "../shared/icons.js";
import { describeBadgeProgress, hasProgressToShow } from "./achievement-text.js";

// The picture of each badge the backend has, by its id. The backend can add a
// badge before the frontend knows it, so one missing here gets the plain one.
const BADGE_ICONS = new Map([
  ["first-find", "pawPrint"],
  ["sharp-eye", "eye"],
  ["film-maker", "video"],
  ["teacher", "graduationCap"],
  ["corrector", "pencil"],
  ["discoverer", "compass"],
  ["helping-hand", "heart"],
  ["on-a-roll", "flame"],
]);
const PLAIN_BADGE_ICON = "award";

/**
 * A badge's card: its picture, its name, what earns it, and whether the user
 * has earned it, or how far they are towards it.
 *
 * @param badge one of the badges `getAchievements` gives.
 */
export function createBadgeCard(badge) {
  const card = createElement("li", badge.isEarned ? "badge-card is-earned" : "badge-card");

  const icon = createElement("div", "badge-card__icon");
  icon.innerHTML = svgIcon(BADGE_ICONS.get(badge.id) ?? PLAIN_BADGE_ICON, "badge-card__svg");

  const body = createElement("div", "badge-card__body");
  body.append(
    createElement("h3", "badge-card__name", badge.name),
    createElement("p", "badge-card__description", badge.description),
  );

  if (hasProgressToShow(badge)) {
    body.append(createProgressBar(badge));
  }

  body.append(createElement("p", "badge-card__status", describeBadgeProgress(badge)));

  card.append(icon, body);
  return card;
}

// The words under it say the same, so the bar itself stays silent.
function createProgressBar({ goal, progress }) {
  const track = createElement("div", "badge-card__track");
  track.setAttribute("aria-hidden", "true");

  const fill = createElement("div", "badge-card__fill");
  fill.style.width = `${Math.min(progress / goal, 1) * 100}%`;

  track.append(fill);
  return track;
}
