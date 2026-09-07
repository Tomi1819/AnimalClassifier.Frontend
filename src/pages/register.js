import { apiFetch } from "../api/client.js";
import { hideMessage, showError, showProgress } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";

const LOGIN_PAGE = "/pages/login.html";

initNavigation();

const formMessage = document.getElementById("formMessage");

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showProgress(formMessage, "Creating your account...");

  const registration = {
    fullName: document.getElementById("fullName").value,
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };

  try {
    await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(registration),
    });

    hideMessage(formMessage);
    window.location.href = LOGIN_PAGE;
  } catch (error) {
    console.error("Registration failed:", error);
    // The error already explains itself, whether it is the backend rejecting
    // the details or the server being unreachable.
    showError(formMessage, error.message);
  }
});
