import { apiFetch } from "../api/client.js";
import { setSession } from "../auth/session.js";
import { hideMessage, showError, showProgress } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";
import { initPasswordToggles } from "../shared/password-toggle.js";

const DASHBOARD_PAGE = "/pages/dashboard.html";

initNavigation();
initPasswordToggles();

const formMessage = document.getElementById("formMessage");

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  showProgress(formMessage, "Signing in...");

  const credentials = {
    email: document.getElementById("email").value,
    password: document.getElementById("password").value,
  };

  try {
    const { token, roles } = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    setSession(token, roles);
    hideMessage(formMessage);
    window.location.href = DASHBOARD_PAGE;
  } catch (error) {
    console.error("Login failed:", error);
    // The backend already answers 401 with "Invalid email or password.", so
    // reporting its message keeps an offline server from looking like a typo.
    showError(formMessage, error.message);
  }
});
