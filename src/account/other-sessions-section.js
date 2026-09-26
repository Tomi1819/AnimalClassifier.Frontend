import { signOutOtherSessions } from "../auth/account.js";
import { askToConfirm } from "../shared/confirm.js";
import { showError, showProgress, showSuccess } from "../shared/feedback.js";

const CONFIRM_QUESTION = "Sign out of all other devices?";
const CONFIRM_NOTE =
  "They will need your password or a passkey to get back in, and this device " +
  "stays signed in. If a device is lost, remove its passkey as well.";
const SIGNED_OUT_MESSAGE = "Every other device has been signed out.";

/**
 * Signs the account out everywhere but here. It is a single action rather than
 * a change to fill in, so the row asks to confirm instead of opening.
 */
export function initOtherSessionsSection() {
  const section = collectSectionElements();

  section.button.addEventListener("click", () => confirmSignOut(section));
}

function collectSectionElements() {
  return {
    button: document.getElementById("signOutOtherSessions"),
    message: document.getElementById("otherSessionsMessage"),
  };
}

async function confirmSignOut(section) {
  if (!(await askToConfirm(CONFIRM_QUESTION, CONFIRM_NOTE))) {
    return;
  }

  // A second request would carry the token the first one replaces, and the
  // backend would end the session over it.
  section.button.disabled = true;
  showProgress(section.message, "Signing out your other devices...");

  try {
    await signOutOtherSessions();
    showSuccess(section.message, SIGNED_OUT_MESSAGE);
  } catch (error) {
    console.error("Signing out the other sessions failed:", error);
    showError(section.message, error.message);
  } finally {
    section.button.disabled = false;
  }
}
