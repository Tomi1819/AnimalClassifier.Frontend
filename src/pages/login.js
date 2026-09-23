import { apiFetch } from "../api/client.js";
import { isPasskeySupported, signInWithPasskey } from "../auth/passkeys.js";
import { setSession } from "../auth/session.js";
import { hideMessage, showError, showProgress } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";
import { initPasswordToggles } from "../shared/password-toggle.js";

const DASHBOARD_PAGE = "/pages/dashboard.html";

initNavigation();
initPasswordToggles();

const formMessage = document.getElementById("formMessage");

initPasskeySignIn();

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showProgress(formMessage, "Signing in...");

  const credentials = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };

  await signIn(() =>
    apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    }),
  );
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
  try {
    const { token, roles } = await attempt();

    setSession(token, roles);
    hideMessage(formMessage);
    window.location.href = DASHBOARD_PAGE;
  } catch (error) {
    console.error("Sign in failed:", error);
    showError(formMessage, error.message);
  }
}
