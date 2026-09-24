import { apiFetch } from "../api/client.js";
import { showError, showProgress, showSuccess } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";
import { initPasswordToggles } from "../shared/password-toggle.js";
import { initTheme } from "../shared/theme.js";

const LOGIN_PAGE = "/pages/login.html";

const INCOMPLETE_LINK_MESSAGE =
  "This link is incomplete. Please ask for a new one.";
const MISMATCH_MESSAGE = "The two passwords do not match.";

// Long enough to read what happened, short enough not to feel stuck.
const REDIRECT_DELAY_MS = 2500;

initTheme();
initNavigation();
initPasswordToggles();

const form = document.getElementById("resetPasswordForm");
const formMessage = document.getElementById("formMessage");

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

  showProgress(formMessage, "Changing your password...");

  try {
    const { message } = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ ...link, newPassword: password }),
    });

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
