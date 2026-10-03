import { register } from "../auth/authentication.js";
import { hideMessage, showError, showProgress } from "../shared/feedback.js";
import { initPage } from "../shared/page.js";
import { LOGIN_PAGE } from "../shared/pages.js";
import { initPasswordToggles } from "../shared/password-toggle.js";

initPage();
initPasswordToggles();

const form = document.getElementById("registerForm");
const formMessage = document.getElementById("formMessage");
const submitButton = form.querySelector('[type="submit"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  // A second submission would find the account the first one created, and
  // report the address as taken.
  submitButton.disabled = true;
  showProgress(formMessage, "Creating your account...");

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    await register(fullName, email, password);

    hideMessage(formMessage);
    window.location.href = LOGIN_PAGE;
  } catch (error) {
    console.error("Registration failed:", error);
    // The error already explains itself, whether it is the backend rejecting
    // the details or the server being unreachable.
    showError(formMessage, error.message);

    // Enabled again only on failure, so that it cannot be pressed while the
    // browser is leaving the page.
    submitButton.disabled = false;
  }
});
