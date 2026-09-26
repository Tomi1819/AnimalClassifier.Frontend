const OPEN_SELECTOR = "[data-setting-open]";
const CLOSE_SELECTOR = "[data-setting-close]";
const PANEL_SELECTOR = ".setting__panel";
const OPEN_CLASS = "is-open";

// Opening one setting puts away whichever was open, so the page never holds
// two changes half made.
let openSetting = null;

/**
 * Makes a row of the settings list open in place. Its button, marked
 * `data-setting-open`, reveals the panel that makes the change; a button in the
 * panel marked `data-setting-close`, or Escape, puts it away again.
 *
 * The button and the panel are alternatives, so only one of them is on screen
 * at a time. Focus follows, so a keyboard user is never left on something that
 * has just disappeared.
 *
 * @param row the `.setting` element, holding the button and a `.setting__panel`.
 * @param onOpen called once the panel shows, to focus where the user starts.
 * @param onClose called once it is put away, to discard what was left in it.
 * @returns the row's `open` and `close`, for a section that puts the panel away
 *   itself once its change is made.
 */
export function initSetting(row, { onOpen = () => {}, onClose = () => {} } = {}) {
  const openButton = row.querySelector(OPEN_SELECTOR);
  const panel = row.querySelector(PANEL_SELECTOR);

  // Focusable from script only, for a panel that opens with no field to start
  // on. It stays out of the tab order.
  panel.tabIndex = -1;

  const setOpen = (open) => {
    row.classList.toggle(OPEN_CLASS, open);
    panel.hidden = !open;
    openButton.hidden = open;
  };

  const setting = {
    open() {
      openSetting?.close();
      openSetting = setting;
      setOpen(true);
      onOpen();

      // The button that opened it has just hidden, and focus left with it.
      // Without this, a keyboard user would start again from the top of the
      // page, and Escape would not reach the panel.
      if (!panel.contains(document.activeElement)) {
        panel.focus();
      }
    },

    close() {
      if (openSetting !== setting) {
        return;
      }

      // Read before the panel hides, which takes the focus out of it.
      const focusWasInPanel = panel.contains(document.activeElement);

      openSetting = null;
      setOpen(false);
      onClose();

      if (focusWasInPanel) {
        openButton.focus();
      }
    },
  };

  openButton.addEventListener("click", setting.open);

  for (const closeButton of panel.querySelectorAll(CLOSE_SELECTOR)) {
    closeButton.addEventListener("click", setting.close);
  }

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setting.close();
    }
  });

  return setting;
}
