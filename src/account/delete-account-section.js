import { deleteAccount } from "../auth/account.js";
import { getUserEmail } from "../auth/session.js";
import { askToConfirm } from "../shared/confirm.js";
import { hideMessage, showError, showProgress } from "../shared/feedback.js";
import { initSetting } from "./setting.js";

const HOME_PAGE = "/";

const CONFIRM_QUESTION = "Delete your account for good?";
const CONFIRM_NOTE =
  "Your history and everything you uploaded go with it, and it cannot be undone.";

/**
 * Lets the user delete their account by confirming its password. The password
 * shows it is really them; the question that follows is the last chance to
 * change their mind.
 */
export function initDeleteAccountSection() {
  const section = collectSectionElements();
  section.username.defaultValue = getUserEmail() ?? "";

  initSetting(section.row, {
    onOpen: () => {
      hideMessage(section.message);
      section.password.focus();
    },
    // Nothing typed into a password field outlives the panel it was typed in.
    onClose: () => {
      section.form.reset();
      hideMessage(section.message);
    },
  });

  section.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submit(section);
  });
}

function collectSectionElements() {
  return {
    row: document.getElementById("deleteAccountSetting"),
    form: document.getElementById("deleteAccountForm"),
    username: document.getElementById("deleteAccountUsername"),
    password: document.getElementById("deleteAccountPassword"),
    submitButton: document.getElementById("deleteAccountSubmit"),
    message: document.getElementById("deleteAccountMessage"),
  };
}

async function submit(section) {
  if (!(await askToConfirm(CONFIRM_QUESTION, CONFIRM_NOTE))) {
    return;
  }

  section.submitButton.disabled = true;
  showProgress(section.message, "Deleting your account...");

  try {
    await deleteAccount(section.password.value);

    // There is no account left for this page to show.
    window.location.href = HOME_PAGE;
  } catch (error) {
    console.error("Deleting the account failed:", error);
    // A wrong password and an administrator's account are both explained by
    // the backend's message.
    showError(section.message, error.message);

    // Enabled again only on failure, so the button cannot be pressed a second
    // time while the browser is leaving the page.
    section.submitButton.disabled = false;
  }
}
