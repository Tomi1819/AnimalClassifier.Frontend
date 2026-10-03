import {
  getActivity,
  getMostCommonAnimals,
  getTotalRecognitions,
  getUserCount,
} from "../api/recognitions.js";
import { createElement } from "../shared/dom.js";
import { showError } from "../shared/feedback.js";
import { formatCount, formatDay, pluralize } from "../shared/format.js";
import { initPage, PAGE_ACCESS } from "../shared/page.js";
import { SEARCH_PAGE } from "../shared/pages.js";
import { drawActivityChart } from "../statistics/activity-chart.js";

const NO_VALUE = "—";
const ACTIVITY_DAYS = 30;

// Below this a share keeps a decimal, so small animals do not all read as 0%.
const PRECISE_SHARE_BELOW = 0.1;

const count = new Intl.NumberFormat();
const average = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const share = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });
const preciseShare = new Intl.NumberFormat(undefined, {
  style: "percent",
  maximumFractionDigits: 1,
});

if (initPage(PAGE_ACCESS.SIGNED_IN)) {
  await Promise.all([showStatistics(), showActivity()]);
}

async function showStatistics() {
  const content = document.getElementById("statsContent");

  try {
    // Every figure on the page is derived from all three, so they are shown
    // together or not at all.
    const [total, users, topAnimals] = await Promise.all([
      getTotalRecognitions(),
      getUserCount(),
      getMostCommonAnimals(),
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

/* -------------------------------------------------------------------------
   Ranking
   ------------------------------------------------------------------------- */

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
  const badge = createElement("span", "ranking__rank", rank ?? "");
  // The list is ordered, so the number only repeats what is announced already.
  badge.setAttribute("aria-hidden", "true");

  const label = createElement(href ? "a" : "span", "ranking__name", name);
  if (href) {
    label.href = href;
    label.title = `View ${name} images`;
  }

  const fill = createElement("span", "ranking__fill");
  fill.style.width = `${fraction * 100}%`;

  const track = createElement("span", "ranking__track");
  // The count and share beside the bar carry the same information as text.
  track.setAttribute("aria-hidden", "true");
  track.append(fill);

  const body = createElement("div", "ranking__body");
  body.append(label, track);

  const figures = createElement("div", "ranking__figures");
  figures.append(
    createElement("span", "ranking__count", count.format(value)),
    createElement("span", "ranking__share", formatShare(fraction)),
  );

  const row = createElement("li", rank ? "ranking__row" : "ranking__row ranking__row--rest");
  row.append(badge, body, figures);
  return row;
}

function formatShare(fraction) {
  return (fraction < PRECISE_SHARE_BELOW ? preciseShare : share).format(fraction);
}

/* -------------------------------------------------------------------------
   Activity
   ------------------------------------------------------------------------- */

// Loaded apart from the other figures, which do not depend on it, so a failure
// here leaves the rest of the page in place.
async function showActivity() {
  const chart = document.getElementById("activityChart");
  // Days are counted in the viewer's own time zone, so "today" ends at their midnight.
  const { timeZone } = Intl.DateTimeFormat().resolvedOptions();

  try {
    const days = await getActivity(ACTIVITY_DAYS, timeZone);
    renderActivity(chart, days);
    chart.removeAttribute("aria-busy");
  } catch (error) {
    console.error("Failed to load activity:", error);
    chart.hidden = true;
    document.getElementById("activitySummary").hidden = true;
    showError(document.getElementById("activityStatus"), error.message);
  }
}

function renderActivity(chart, days) {
  const total = days.reduce((sum, day) => sum + day.count, 0);

  if (total === 0) {
    chart.hidden = true;
    document.getElementById("activitySummary").hidden = true;
    document.getElementById("activityEmpty").hidden = false;
    return;
  }

  // The latest of equally busy days, as the one most worth pointing out.
  const busiest = days.reduce((best, day) => (day.count >= best.count ? day : best));
  setText(
    "activitySummary",
    `${pluralize(total, "recognition")} in the last ${ACTIVITY_DAYS} days. ` +
      `The busiest day was ${formatDay(busiest.date)}, with ${count.format(busiest.count)}.`,
  );

  drawActivityChart(chart, days);
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}
