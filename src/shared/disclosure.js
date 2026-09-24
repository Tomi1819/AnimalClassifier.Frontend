const OPEN_CLASS = "is-open";

/**
 * Makes a button show and hide a panel, the way every menu in the bar
 * behaves: the button flips it, and a click anywhere else, Escape, or following
 * a link in it puts it away again.
 *
 * The panel is marked with the `is-open` class rather than `hidden`, so the
 * stylesheet decides what closed looks like; the navigation links, for one,
 * stay on screen on a wide window, where there is nothing to open.
 *
 * @param toggle the button that opens the panel.
 * @param panel the element it opens, which needs an id to be announced by.
 * @param onChange called with whether the panel is now open, for anything else
 *   that follows the state.
 * @returns a function that closes the panel.
 */
export function initDisclosure(toggle, panel, onChange = () => {}) {
  toggle.setAttribute("aria-controls", panel.id);
  toggle.setAttribute("aria-expanded", "false");

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    panel.classList.toggle(OPEN_CLASS, open);
    onChange(open);
  };

  const close = () => {
    if (isOpen(toggle)) {
      setOpen(false);
    }
  };

  toggle.addEventListener("click", () => setOpen(!isOpen(toggle)));

  // A link either leaves the page or, in the case of an action such as signing
  // out, redraws it. Either way the open panel has done its job.
  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      close();
    }
  });

  document.addEventListener("click", (event) => {
    if (!toggle.contains(event.target) && !panel.contains(event.target)) {
      close();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen(toggle)) {
      close();
      toggle.focus();
    }
  });

  return close;
}

// The button's own state is the only record of whether the panel is open.
function isOpen(toggle) {
  return toggle.getAttribute("aria-expanded") === "true";
}
