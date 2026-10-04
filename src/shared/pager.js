import { createGhostButton } from "./dom.js";

/**
 * Draws the controls that page through a longer list the backend answers a
 * page of at a time, as `{ page, pageSize, totalCount }`.
 *
 * @param pager the element the controls replace the contents of.
 * @param onPage called with the page to show, counted from 1.
 */
export function renderPager(pager, { page, pageSize, totalCount }, onPage) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const label = document.createElement("span");
  label.textContent = `Page ${page} of ${pageCount}`;

  const previous = createGhostButton("Previous", () => onPage(page - 1));
  previous.disabled = page <= 1;

  const next = createGhostButton("Next", () => onPage(page + 1));
  next.disabled = page >= pageCount;

  pager.replaceChildren(previous, label, next);
}
