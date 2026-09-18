import { apiFetch } from "../api/client.js";
import { requireAuthentication } from "../auth/session.js";
import { showError } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";

const SEARCH_PAGE = "/pages/search.html";
const NO_VALUE = "—";

// Past this a figure is shortened, so 128,450 reads as 128.5K and still fits its tile.
const COMPACT_FROM = 10_000;
// Below this a share keeps a decimal, so small animals do not all read as 0%.
const PRECISE_SHARE_BELOW = 0.1;

const count = new Intl.NumberFormat();
const compactCount = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 1,
});
const average = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const share = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });
const preciseShare = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

// Module scripts are deferred, so the document is already parsed here.
// The guard runs first, so an expired session never paints the signed-in nav.
if (requireAuthentication()) {
  initNavigation();
  await showStatistics();
}

async function showStatistics() {
  const content = document.getElementById("statsContent");

  try {
    // Every figure on the page is derived from all three, so they are shown
    // together or not at all.
    const [total, users, topAnimals] = await Promise.all([
      apiFetch("/api/statistics/total"),
      apiFetch("/api/statistics/users"),
      apiFetch("/api/statistics/top-animal"),
    ]);

    renderFigures(total, users);
    renderRanking(total, topAnimals);
    content.removeAttribute("aria-busy");
  } catch (error) {
    console.error("Failed to load statistics:", error);
    content.hidden = true;
    showError(document.getElementById("statsStatus"), error.message);
  }
}

function renderFigures(total, users) {
  setText("totalRecognitions", formatCount(total));
  setText("activeUsers", formatCount(users));
  setText("perUser", users > 0 ? average.format(total / users) : NO_VALUE);
}

function renderRanking(total, topAnimals) {
  const list = document.getElementById("ranking");

  if (total === 0 || topAnimals.length === 0) {
    list.hidden = true;
    document.getElementById("rankingCaption").hidden = true;
    document.getElementById("rankingEmpty").hidden = false;
    return;
  }

  const rows = topAnimals.map((animal, index) =>
    createRankingRow({
      rank: index + 1,
      name: animal.animalName,
      count: animal.count,
      share: animal.count / total,
      href: `${SEARCH_PAGE}?q=${encodeURIComponent(animal.animalName)}`,
    }),
  );

  // The endpoint returns only the leaders, so whatever they leave over is
  // shown as one row, which keeps the bars honest about the whole.
  const rest = total - topAnimals.reduce((sum, animal) => sum + animal.count, 0);
  if (rest > 0) {
    rows.push(
      createRankingRow({ name: "All other animals", count: rest, share: rest / total }),
    );
  }

  list.replaceChildren(...rows);
}

function createRankingRow({ rank, name, count: value, share: fraction, href }) {
  const row = document.createElement("li");
  row.className = rank ? "ranking__row" : "ranking__row ranking__row--rest";

  const badge = document.createElement("span");
  badge.className = "ranking__rank";
  badge.textContent = rank ?? "";
  // The list is ordered, so the number only repeats what is announced already.
  badge.setAttribute("aria-hidden", "true");

  const label = document.createElement(href ? "a" : "span");
  label.className = "ranking__name";
  label.textContent = name;
  if (href) {
    label.href = href;
    label.title = `View ${name} images`;
  }

  const fill = document.createElement("span");
  fill.className = "ranking__fill";
  fill.style.width = `${fraction * 100}%`;

  const track = document.createElement("span");
  track.className = "ranking__track";
  // The count and share beside the bar carry the same information as text.
  track.setAttribute("aria-hidden", "true");
  track.append(fill);

  const body = document.createElement("div");
  body.className = "ranking__body";
  body.append(label, track);

  const amount = document.createElement("span");
  amount.className = "ranking__count";
  amount.textContent = count.format(value);

  const percentage = document.createElement("span");
  percentage.className = "ranking__share";
  percentage.textContent = formatShare(fraction);

  const figures = document.createElement("div");
  figures.className = "ranking__figures";
  figures.append(amount, percentage);

  row.append(badge, body, figures);
  return row;
}

function formatCount(value) {
  return value >= COMPACT_FROM ? compactCount.format(value) : count.format(value);
}

function formatShare(fraction) {
  return (fraction < PRECISE_SHARE_BELOW ? preciseShare : share).format(fraction);
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}
