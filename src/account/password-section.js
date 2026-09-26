import { changePassword } from "../auth/password.js";
import { showError, showProgress, showSuccess } from "../shared/feedback.js";

const MISMATCH_MESSAGE = "The two new passwords do not match.";
const CHANGED_MESSAGE =
  "Your password has been changed. Any other devices have been signed out.";

/**
 * Lets the user change their password by confirming the current one.
 */
export function initPasswordSection() {
  const section = collectSectionElements();

  section.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submit(section);
  });
}

function collectSectionElements() {
  return {
    form: document.getElementById("changePasswordForm"),
    current: document.getElementById("currentPassword"),
    next: document.getElementById("newPassword"),
    confirmation: document.getElementById("newPasswordConfirmation"),
    submitButton: document.getElementById("changePasswordSubmit"),
    message: document.getElementById("passwordMessage"),
  };
}

async function submit(section) {
  // Caught here rather than by the backend, which is given one new password
  // and cannot tell that the user meant to type a different one.
  if (section.next.value !== section.confirmation.value) {
    showError(section.message, MISMATCH_MESSAGE);
    return;
  }

  // A second submission would carry the token the first one replaces, and the
  // backend would end the session over it.
  section.submitButton.disabled = true;
  showProgress(section.message, "Changing your password...");

  try {
    await changePassword(section.current.value, section.next.value);

    section.form.reset();
    showSuccess(section.message, CHANGED_MESSAGE);
  } catch (error) {
    console.error("Changing the password failed:", error);
    // A wrong current password and a new one that fails the rules are both
    // explained by the backend's message.
    showError(section.message, error.message);
  } finally {
    section.submitButton.disabled = false;
  }
}
