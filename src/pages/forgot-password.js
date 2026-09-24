import { apiFetch } from "../api/client.js";
import { showError, showProgress, showSuccess } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";
import { initTheme } from "../shared/theme.js";

initTheme();
initNavigation();

const form = document.getElementById("forgotPasswordForm");
const formMessage = document.getElementById("formMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showProgress(formMessage, "Sending the link...");

  const request = { email: document.getElementById("email").value };

  try {
    const { message } = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(request),
    });

    // The backend answers the same way whether or not the address has an
    // account, so that this page cannot be used to find out who is
    // registered. Its message is worded for that, so it is shown as it comes.
    //
    // The form stays where it is: someone who mistyped their address waits for
    // an email that is never coming, and correcting it should not mean finding
    // their way back to this page again.
    showSuccess(formMessage, message);
  } catch (error) {
    console.error("Requesting a password reset failed:", error);
    showError(formMessage, error.message);
  }
});
