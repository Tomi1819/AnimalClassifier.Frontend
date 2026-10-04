import { signInWithPassword } from "../auth/authentication.js";
import { isPasskeySupported, signInWithPasskey } from "../auth/passkeys.js";
import { setSession } from "../auth/session.js";
import { hideMessage, showError, showProgress } from "../shared/feedback.js";
import { initPage } from "../shared/page.js";
import { DASHBOARD_PAGE } from "../shared/pages.js";
import { initPasswordToggles } from "../shared/password-toggle.js";

initPage();
initPasswordToggles();

const form = document.getElementById("loginForm");
const formMessage = document.getElementById("formMessage");

// Both ways in, which wait on each other: a second attempt started over the
// first could sign in with one and report the other's failure.
const signInButtons = [
  form.querySelector('[type="submit"]'),
  document.getElementById("passkeyButton"),
];

initPasskeySignIn();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showProgress(formMessage, "Signing in...");

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  await signIn(() => signInWithPassword(email, password));
});

/**
 * Offers the passkey button only where it can work, so that a browser without
 * passkeys shows a password form and nothing else.
 */
function initPasskeySignIn() {
  if (!isPasskeySupported()) {
    return;
  }

  document.getElementById("passkeySignIn").hidden = false;

  document.getElementById("passkeyButton").addEventListener("click", async () => {
    showProgress(formMessage, "Waiting for your passkey...");

    await signIn(signInWithPasskey);
  });
}

/**
 * Both ways in end the same way: a session is kept and the user carries on to
 * the dashboard. Whichever failed, the error explains itself.
 */
async function signIn(attempt) {
  setDisabled(signInButtons, true);

  try {
    const { token, roles } = await attempt();

    setSession(token, roles);
    hideMessage(formMessage);
    window.location.href = DASHBOARD_PAGE;
  } catch (error) {
    console.error("Sign in failed:", error);
    showError(formMessage, error.message);

    // Enabled again only on failure, so that neither can be pressed while
    // the browser is leaving the page.
    setDisabled(signInButtons, false);
  }
}

function setDisabled(buttons, disabled) {
  for (const button of buttons) {
    button.disabled = disabled;
  }
}
