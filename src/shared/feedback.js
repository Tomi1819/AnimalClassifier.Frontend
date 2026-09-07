// Errors are announced assertively so a screen reader interrupts with them;
// progress and success are polite, because the user is already waiting.
const VARIANTS = {
  error: { className: "message--error", role: "alert" },
  success: { className: "message--success", role: "status" },
  progress: { className: "message--progress", role: "status" },
};

/**
 * Inline page messages, shown in place of an alert box so that a failure
 * appears next to whatever caused it and does not have to be dismissed
 * before the user can correct it.
 *
 * Each target is an element the page reserves for this, marked up as
 * `<p class="message" hidden></p>`.
 */
export function showError(element, message) {
  render(element, message, VARIANTS.error);
}

export function showSuccess(element, message) {
  render(element, message, VARIANTS.success);
}

export function showProgress(element, message) {
  render(element, message, VARIANTS.progress);
}

export function hideMessage(element) {
  element.textContent = "";
  element.hidden = true;
}

function render(element, message, { className, role }) {
  element.textContent = message;
  // Replaces the class outright, so the previous variant cannot linger.
  element.className = `message ${className}`;
  element.setAttribute("role", role);
  element.hidden = false;
}
