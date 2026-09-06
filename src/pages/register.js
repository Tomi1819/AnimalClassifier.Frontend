import { apiFetch } from "../api/client.js";
import { initNavigation } from "../shared/nav.js";

const LOGIN_PAGE = "/pages/login.html";

initNavigation();

document.getElementById("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();

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

    window.location.href = LOGIN_PAGE;
  } catch (error) {
    console.error("Registration failed:", error);
    alert(`Registration error: ${error.message}`);
  }
});
