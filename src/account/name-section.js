import { changeName, getProfile } from "../auth/account.js";
import { hideMessage, showError, showProgress, showSuccess } from "../shared/feedback.js";
import { initSetting } from "./setting.js";

const CHANGED_MESSAGE = "Your name has been changed.";

/**
 * Shows the name the account goes by and lets the user change it.
 */
export async function initNameSection() {
  const section = collectSectionElements();

  const setting = initSetting(section.row, {
    onOpen: () => {
      hideMessage(section.message);
      // Selected, since a name is usually corrected or replaced as a whole.
      section.input.focus();
      section.input.select();
    },
    onClose: () => {
      section.form.reset();
      hideMessage(section.message);
    },
  });

  section.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submit(section, setting);
  });

  await showCurrentName(section);
}

function collectSectionElements() {
  return {
    row: document.getElementById("nameSetting"),
    summary: document.getElementById("nameSummary"),
    form: document.getElementById("changeNameForm"),
    input: document.getElementById("fullName"),
    submitButton: document.getElementById("changeNameSubmit"),
    message: document.getElementById("nameMessage"),
  };
}

async function showCurrentName(section) {
  try {
    const { fullName } = await getProfile();
    showName(section, fullName);
  } catch (error) {
    console.error("Could not load the profile:", error);
    showError(section.message, error.message);
  }
}

// Set as the field's default rather than its value, so that closing the panel
// puts back the name the account has instead of whatever was typed.
function showName(section, fullName) {
  section.summary.textContent = fullName;
  section.input.defaultValue = fullName;
}

async function submit(section, setting) {
  section.submitButton.disabled = true;
  showProgress(section.message, "Saving your name...");

  try {
    // The backend's copy, which has its spacing tidied, is the one shown.
    const { fullName } = await changeName(section.input.value);
    showName(section, fullName);

    // Closing clears the form and its message, so the news follows it.
    setting.close();
    showSuccess(section.message, CHANGED_MESSAGE);
  } catch (error) {
    console.error("Changing the name failed:", error);
    // A blank name and one that is too long are both explained by the
    // backend's message.
    showError(section.message, error.message);
  } finally {
    section.submitButton.disabled = false;
  }
}
