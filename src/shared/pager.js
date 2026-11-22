import { createGhostButton } from "./dom.js";

/**
 * Draws the controls that page through a longer list the backend answers a
 * page of at a time, as `{ page, pageSize, totalCount }`.
 *
 * @param pager the element the controls replace the contents of.
 * @param onPage called with the page to show, counted from 1. The buttons wait
 *   for the promise it answers with, so that a click made while a page loads
 *   cannot ask for another from the page still on screen.
 */
export function renderPager(pager, { page, pageSize, totalCount }, onPage) {
  const pageCount = countPages(totalCount, pageSize);

  const label = document.createElement("span");
  label.textContent = `Page ${page} of ${pageCount}`;

  const previous = createGhostButton("Previous", () => turnTo(page - 1));
  const next = createGhostButton("Next", () => turnTo(page + 1));

  function enable() {
    previous.disabled = page <= 1;
    next.disabled = page >= pageCount;
  }

  // A page that loads draws the pager afresh, but one that fails leaves these
  // buttons on screen, to try again with.
  async function turnTo(target) {
    previous.disabled = true;
    next.disabled = true;

    try {
      await onPage(target);
    } finally {
      enable();
    }
  }

  enable();
  pager.replaceChildren(previous, label, next);
}

/**
 * The page to show once one entry of the page shown has been removed. It is
 * the same page, which the next one's first entry moves up into, unless the
 * entry was the last page's only one, and that page is gone.
 *
 * @param shown the list as it was, `{ page, pageSize, totalCount }`.
 * @returns the page, counted from 1.
 */
export function pageAfterRemovingOne({ page, pageSize, totalCount }) {
  return Math.min(page, countPages(totalCount - 1, pageSize));
}

// An empty list still has its one page, which says there is nothing on it.
function countPages(totalCount, pageSize) {
  return Math.max(1, Math.ceil(totalCount / pageSize));
}
