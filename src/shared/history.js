import { resolveUrl } from "../api/client.js";
import { describeVerdict } from "../feedback/feedback-text.js";
import { createElement } from "./dom.js";
import { formatDate } from "./format.js";

/**
 * A recognition built from an entry in a user's history, as the dashboard and
 * the admin page render it. The per-animal breakdown of a video is not stored,
 * so it carries everything except that.
 */
export function fromHistoryItem(item) {
  return {
    id: item.id,
    type: item.isVideo ? "video" : "image",
    url: resolveUrl(item.mediaPath),
    animal: item.recognizedAnimal,
    date: item.dateRecognized,
    score: item.predictionScore,
    framesProcessed: item.framesProcessed,
    feedback: item.feedback,
  };
}

/**
 * One entry of a history list.
 *
 * @param onSelect called when the user chooses the entry, which makes its
 *   title a button. Left out, the entry is only shown.
 */
export function createHistoryCard(recognition, { onSelect } = {}) {
  const { id, type, url, animal, date, framesProcessed, topAnimals, feedback } = recognition;
  const isVideo = type === "video";

  const media = document.createElement(isVideo ? "video" : "img");
  media.className = "history-card__media";
  media.src = url;
  if (!isVideo) {
    media.alt = animal;
  }

  const badge = document.createElement("span");
  badge.className = isVideo ? "badge badge--video" : "badge";
  badge.textContent = isVideo ? "Video" : "Image";

  const title = createElement("h4", "history-card__title");
  title.append(onSelect ? createSelectButton(animal, date, onSelect) : animal);

  const meta = document.createElement("p");
  meta.className = "history-card__meta";
  meta.textContent = isVideo
    ? `${formatDate(date)} · ${framesProcessed} frames`
    : formatDate(date);

  const body = document.createElement("div");
  body.className = "history-card__body";
  body.append(badge, title, meta);

  if (isVideo && topAnimals?.length > 1) {
    const extra = document.createElement("p");
    extra.className = "history-card__extra";
    extra.textContent = topAnimals.map((entry) => entry.animal).join(", ");
    body.append(extra);
  }

  if (feedback) {
    body.append(createElement("p", "history-card__feedback", describeVerdict(feedback)));
  }

  const card = document.createElement("li");
  card.className = "history-card";
  card.append(media, body);

  // Found by it when the recognition changes, such as when feedback is given.
  if (id !== undefined) {
    card.dataset.recognitionId = id;
  }

  return card;
}

// The title is what a screen reader reads out for the whole card, so it names
// the entry in full; the stylesheet stretches it over the card for the mouse.
function createSelectButton(animal, date, onSelect) {
  const button = createElement("button", "history-card__select", animal);
  button.type = "button";
  button.setAttribute("aria-label", `Show the ${animal} recognised ${formatDate(date)}`);
  button.addEventListener("click", onSelect);
  return button;
}
