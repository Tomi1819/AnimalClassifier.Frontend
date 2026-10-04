import { resetPassword } from "../auth/authentication.js";
import { showError, showProgress, showSuccess } from "../shared/feedback.js";
import { initPage } from "../shared/page.js";
import { LOGIN_PAGE } from "../shared/pages.js";
import { initPasswordToggles } from "../shared/password-toggle.js";

const INCOMPLETE_LINK_MESSAGE =
  "This link is incomplete. Please ask for a new one.";
const MISMATCH_MESSAGE = "The two passwords do not match.";

// Long enough to read what happened, short enough not to feel stuck.
const REDIRECT_DELAY_MS = 2500;

initPage();
initPasswordToggles();

const form = document.getElementById("resetPasswordForm");
const formMessage = document.getElementById("formMessage");
const submitButton = form.querySelector('[type="submit"]');

const link = readLink();

if (link === null) {
  form.hidden = true;
  showError(formMessage, INCOMPLETE_LINK_MESSAGE);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = document.getElementById("password").value;

  // Caught here rather than by the backend, which is given one password and
  // cannot tell that the user meant to type a different one.
  if (password !== document.getElementById("confirmation").value) {
    showError(formMessage, MISMATCH_MESSAGE);
    return;
  }

  // The link works once, so a second submission would be refused for using it
  // again, after the first had already changed the password.
  submitButton.disabled = true;
  showProgress(formMessage, "Changing your password...");

  try {
    const { message } = await resetPassword(link.email, link.token, password);

    // The token is spent and the account's sessions have ended, so there is
    // nothing left to do on this page.
    form.hidden = true;
    showSuccess(formMessage, message);

    window.setTimeout(() => {
      window.location.href = LOGIN_PAGE;
    }, REDIRECT_DELAY_MS);
  } catch (error) {
    console.error("Resetting the password failed:", error);
    // Whether the link has expired or the password fails the rules, the
    // backend's message is the one that explains it.
    showError(formMessage, error.message);
    submitButton.disabled = false;
  }
});

/**
 * Reads the address and the token out of the link, then takes them back out
 * of the address bar. The token is a credential for as long as it lives, and
 * leaving it there would put it in the browser's history and in any URL the
 * user copies out of it.
 *
 * @returns the pair, or null when the link arrived without them.
 */
function readLink() {
  const parameters = new URLSearchParams(window.location.search);
  const email = parameters.get("email");
  const token = parameters.get("token");

  window.history.replaceState(null, "", window.location.pathname);

  return email && token ? { email, token } : null;
}
