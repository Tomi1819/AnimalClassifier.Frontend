import { createElement } from "../shared/dom.js";
import { formatCount, formatDay, parseDay, pluralize } from "../shared/format.js";

// Few enough gridlines to stay out of the way, enough to read a bar against.
const TARGET_TICKS = 3;
const LABEL_EVERY_DAYS = 7;
// A day with any recognitions never draws a bar too short to see or hover.
const MIN_BAR_PX = 3;
const TOOLTIP_GAP_PX = 6;

const axisDate = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

/**
 * Draws a bar for each day's recognitions, with gridlines to read them
 * against and a tooltip for the day under the pointer or the keyboard.
 *
 * The days are a list a screen reader reads as text, and a keyboard moves
 * through as one stop with the arrow keys.
 *
 * @param chart the element drawn into, replacing what it held.
 * @param days `{ date, count }` for each day, oldest first and ending today.
 */
export function drawActivityChart(chart, days) {
  const busiest = Math.max(...days.map((day) => day.count));

  // Scaled to at least a few recognitions, so a single one does not fill the chart.
  const { step, top } = niceScale(Math.max(busiest, TARGET_TICKS));

  const tooltip = createElement("div", "activity__tooltip");
  tooltip.hidden = true;
  // Every value is also in the list for screen readers, so this only repeats it.
  tooltip.setAttribute("aria-hidden", "true");

  const plot = createElement("div", "activity__plot");
  plot.append(createGrid(step, top), createColumns(days, top, tooltip), tooltip);

  chart.replaceChildren(plot, createAxis(days));
}

/**
 * Rounds the axis up to a step of 1, 2 or 5 times a power of ten, so the
 * gridlines land on round numbers.
 *
 * @param max the largest value the axis has to reach.
 * @returns the step between gridlines, and the axis's top, a whole number of
 *   steps at or above `max`.
 */
export function niceScale(max) {
  const roughStep = Math.max(1, max / TARGET_TICKS);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 5, 10]
    .map((factor) => factor * magnitude)
    .find((candidate) => candidate >= roughStep);

  return { step, top: Math.ceil(max / step) * step };
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
  const items = days.map(({ date, count }) => {
    const bar = createElement("span", "activity__bar");
    if (count > 0) {
      bar.style.height = `max(${MIN_BAR_PX}px, ${(count / top) * 100}%)`;
    }

    const item = createElement("li", "activity__day");
    item.append(
      bar,
      createElement("span", "visually-hidden", `${formatDay(date)}: ${pluralize(count, "recognition")}`),
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

    const { date, count } = days[index];
    tooltip.replaceChildren(
      createElement("strong", "", pluralize(count, "recognition")),
      createElement("span", "", formatDay(date)),
    );

    tooltip.hidden = false;
    placeTooltip(tooltip, index, days.length, count / top);
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
    const text = index === days.length - 1 ? "Today" : axisDate.format(parseDay(days[index].date));
    const label = createElement("span", "activity__label", text);
    label.style.left = `${((index + 0.5) / days.length) * 100}%`;
    axis.prepend(label);
  }

  return axis;
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
