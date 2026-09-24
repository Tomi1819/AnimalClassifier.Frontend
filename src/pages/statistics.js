import { apiFetch } from "../api/client.js";
import { requireAuthentication } from "../auth/session.js";
import { showError } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";
import { initTheme } from "../shared/theme.js";

const SEARCH_PAGE = "/pages/search.html";
const NO_VALUE = "—";

// Past this a figure is shortened, so 128,450 reads as 128.5K and still fits its tile.
const COMPACT_FROM = 10_000;
// Below this a share keeps a decimal, so small animals do not all read as 0%.
const PRECISE_SHARE_BELOW = 0.1;

const ACTIVITY_DAYS = 30;
// Few enough gridlines to stay out of the way, enough to read a bar against.
const TARGET_TICKS = 3;
const LABEL_EVERY_DAYS = 7;
// A day with any recognitions never draws a bar too short to see or hover.
const MIN_BAR_PX = 3;
const TOOLTIP_GAP_PX = 6;

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
const axisDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const fullDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
});

// Module scripts are deferred, so the document is already parsed here.
// The guard runs first, so an expired session never paints the signed-in nav.
if (requireAuthentication()) {
  initTheme();
  initNavigation();
  await Promise.all([showStatistics(), showActivity()]);
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
    const days = await apiFetch(
      `/api/statistics/activity?days=${ACTIVITY_DAYS}&timeZone=${encodeURIComponent(timeZone)}`,
    );
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
      `The busiest day was ${fullDate.format(toDate(busiest.date))}, with ${count.format(busiest.count)}.`,
  );

  // Scaled to at least a few recognitions, so a single one does not fill the chart.
  const { step, top } = niceScale(Math.max(busiest.count, TARGET_TICKS));

  const tooltip = createElement("div", "activity__tooltip");
  tooltip.hidden = true;
  // Every value is also in the list for screen readers, so this only repeats it.
  tooltip.setAttribute("aria-hidden", "true");

  const plot = createElement("div", "activity__plot");
  plot.append(createGrid(step, top), createColumns(days, top, tooltip), tooltip);

  chart.replaceChildren(plot, createAxis(days));
}

function createGrid(step, top) {
  const grid = createElement("div", "activity__grid");
  grid.setAttribute("aria-hidden", "true");

  for (let value = 0; value <= top; value += step) {
    const line = createElement("span", "activity__gridline");
    line.style.bottom = `${(value / top) * 100}%`;
    line.append(createElement("span", "activity__tick", formatCount(value)));
    grid.append(line);
  }

  return grid;
}

function createColumns(days, top, tooltip) {
  const items = days.map(({ date, count: value }) => {
    const bar = createElement("span", "activity__bar");
    if (value > 0) {
      bar.style.height = `max(${MIN_BAR_PX}px, ${(value / top) * 100}%)`;
    }

    const item = createElement("li", "activity__day");
    item.append(
      bar,
      createElement(
        "span",
        "visually-hidden",
        `${fullDate.format(toDate(date))}: ${pluralize(value, "recognition")}`,
      ),
    );
    return item;
  });

  const list = createElement("ol", "activity__days");
  // Focusable as one stop, with the arrow keys moving between days, rather
  // than a tab stop for each of them.
  list.tabIndex = 0;
  list.setAttribute("aria-label", "Recognitions per day");
  list.append(...items);

  initActivityHover(list, items, days, top, tooltip);
  return list;
}

function initActivityHover(list, items, days, top, tooltip) {
  let active = -1;

  const show = (index) => {
    if (index === active) {
      return;
    }

    items[active]?.classList.remove("is-active");
    items[index].classList.add("is-active");
    active = index;

    const { date, count: value } = days[index];
    tooltip.replaceChildren(
      createElement("strong", "", pluralize(value, "recognition")),
      createElement("span", "", fullDate.format(toDate(date))),
    );

    tooltip.hidden = false;
    placeTooltip(tooltip, index, days.length, value / top);
  };

  const hide = () => {
    items[active]?.classList.remove("is-active");
    active = -1;
    tooltip.hidden = true;
  };

  const showPointed = (event) => {
    const item = event.target.closest(".activity__day");
    if (item) {
      show(items.indexOf(item));
    }
  };

  list.addEventListener("pointermove", showPointed);
  list.addEventListener("pointerdown", showPointed);
  list.addEventListener("pointerleave", (event) => {
    // A tap has no hover to end, so the day it picked stays shown.
    if (event.pointerType === "mouse") {
      hide();
    }
  });

  // Keyboard focus starts on today, the day most likely to be looked for.
  list.addEventListener("focus", () => show(active === -1 ? items.length - 1 : active));
  list.addEventListener("blur", hide);
  list.addEventListener("keydown", (event) => {
    const current = active === -1 ? items.length - 1 : active;
    const target = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      Home: 0,
      End: items.length - 1,
    }[event.key];

    if (target === undefined) {
      return;
    }

    event.preventDefault();
    show(Math.min(Math.max(target, 0), items.length - 1));
  });
}

function createAxis(days) {
  const axis = createElement("div", "activity__axis");
  axis.setAttribute("aria-hidden", "true");

  // Counted back from today, so the most recent day is always labelled.
  for (let index = days.length - 1; index >= 0; index -= LABEL_EVERY_DAYS) {
    const text = index === days.length - 1 ? "Today" : axisDate.format(toDate(days[index].date));
    const label = createElement("span", "activity__label", text);
    label.style.left = `${((index + 0.5) / days.length) * 100}%`;
    axis.prepend(label);
  }

  return axis;
}

// Rounds the axis up to a step of 1, 2 or 5 times a power of ten, so the
// gridlines land on round numbers.
function niceScale(max) {
  const roughStep = Math.max(1, max / TARGET_TICKS);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .find((candidate) => candidate >= roughStep);

  return { step, top: Math.ceil(max / step) * step };
}

// Beside the day rather than above it, so it never covers the bar being read,
// and on the side facing the middle so it stays inside the card. It centres on
// the top of the bar, as far as the plot has room.
function placeTooltip(tooltip, index, dayCount, height) {
  const plotHeight = tooltip.offsetParent.clientHeight;
  const centre = height * plotHeight - tooltip.offsetHeight / 2;
  const bottom = Math.min(Math.max(centre, 0), plotHeight - tooltip.offsetHeight);
  const onLeft = (index + 0.5) / dayCount > 0.5;

  tooltip.style.bottom = `${bottom}px`;
  tooltip.style.left = `${((onLeft ? index : index + 1) / dayCount) * 100}%`;
  tooltip.style.transform = onLeft
    ? `translateX(calc(-100% - ${TOOLTIP_GAP_PX}px))`
    : `translateX(${TOOLTIP_GAP_PX}px)`;
}

// A date on its own is read as midnight UTC, which is still the day before
// anywhere west of it; with a time it is read as local.
function toDate(day) {
  return new Date(`${day}T00:00`);
}

/* -------------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------------- */

function formatCount(value) {
  return value >= COMPACT_FROM ? compactCount.format(value) : count.format(value);
}

function formatShare(fraction) {
  return (fraction < PRECISE_SHARE_BELOW ? preciseShare : share).format(fraction);
}

function pluralize(value, noun) {
  return `${count.format(value)} ${noun}${value === 1 ? "" : "s"}`;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}
