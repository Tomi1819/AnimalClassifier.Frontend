const TOGGLE_SELECTOR = "[data-password-toggle]";
const ICON_SELECTOR = "[data-icon]";

const SHOW_LABEL = "Show password";
const HIDE_LABEL = "Hide password";

/**
 * Wires up the reveal button a password field carries, so a typo in a masked
 * field can be found without retyping it.
 *
 * A button opts in with `data-password-toggle="<id of the input>"` and holds
 * one icon per state, marked `data-icon="eye"` and `data-icon="eye-off"`.
 */
export function initPasswordToggles() {
  for (const toggle of document.querySelectorAll(TOGGLE_SELECTOR)) {
    toggle.addEventListener("click", () => togglePassword(toggle));
  }
}

/**
 * Masks every password field in a container again. Resetting a form empties
 * its fields but leaves a revealed one revealed, so whatever is typed into it
 * next would show.
 *
 * @param container the element holding the fields and their reveal buttons.
 */
export function maskPasswords(container) {
  for (const toggle of container.querySelectorAll(TOGGLE_SELECTOR)) {
    setRevealed(toggle, false);
  }
}

function togglePassword(toggle) {
  const input = document.getElementById(toggle.dataset.passwordToggle);

  setRevealed(toggle, input?.type === "password");
}

function setRevealed(toggle, revealed) {
  const input = document.getElementById(toggle.dataset.passwordToggle);
  if (!input) {
    return;
  }

  input.type = revealed ? "text" : "password";
  toggle.setAttribute("aria-label", revealed ? HIDE_LABEL : SHOW_LABEL);

  // The icon offers the next action, so it is the opposite of the state.
  const visibleIcon = revealed ? "eye-off" : "eye";
  for (const icon of toggle.querySelectorAll(ICON_SELECTOR)) {
    // The icons are SVG, which carries no `hidden` property to assign to,
    // only the attribute the stylesheet matches on.
    icon.toggleAttribute("hidden", icon.dataset.icon !== visibleIcon);
  }
}
