import { resolveUrl } from "../api/client.js";

/**
 * A recognition built from an entry in a user's history, as the dashboard and
 * the admin page render it. The per-animal breakdown of a video is not stored,
 * so it carries everything except that.
 */
export function fromHistoryItem(item) {
  return {
    type: item.isVideo ? "video" : "image",
    url: resolveUrl(item.mediaPath),
    animal: item.recognizedAnimal,
    date: item.dateRecognized,
    score: item.predictionScore,
    framesProcessed: item.framesProcessed,
  };
}

export function formatDate(date) {
  return new Date(date).toLocaleString();
}

export function createHistoryCard({ type, url, animal, date, framesProcessed, topAnimals }) {
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

  const title = document.createElement("h4");
  title.className = "history-card__title";
  title.textContent = animal;

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

  const card = document.createElement("li");
  card.className = "history-card";
  card.append(media, body);
  return card;
}
