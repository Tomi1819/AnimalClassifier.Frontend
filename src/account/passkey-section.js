import {
  isPasskeySupported,
  listPasskeys,
  registerPasskey,
  removePasskey,
} from "../auth/passkeys.js";
import { askToConfirm } from "../shared/confirm.js";
import { hideMessage, showError, showProgress, showSuccess } from "../shared/feedback.js";
import { formatDate } from "../shared/history.js";
import { initSetting } from "./setting.js";

const NO_PASSKEYS_SUMMARY = "Not set up yet";
const UNSUPPORTED =
  "This browser cannot use passkeys. Sign in with your password instead.";

/**
 * Lists the account's passkeys and lets the user add and remove them.
 */
export async function initPasskeySection() {
  const page = collectPageElements();

  if (!isPasskeySupported()) {
    // Nothing in this section works without them, so the row says so rather
    // than offering actions that would fail.
    page.summary.textContent = UNSUPPORTED;
    return;
  }

  page.manageButton.hidden = false;
  initSetting(page.row, {
    onOpen: () => hideMessage(page.message),
    onClose: () => setFormOpen(page, false),
  });

  initAdding(page);
  await showPasskeys(page);
}

function collectPageElements() {
  return {
    row: document.getElementById("passkeySetting"),
    summary: document.getElementById("passkeySummary"),
    manageButton: document.getElementById("managePasskeys"),
    actions: document.getElementById("passkeyActions"),
    message: document.getElementById("passkeyMessage"),
    empty: document.getElementById("passkeyEmpty"),
    list: document.getElementById("passkeyList"),
    addButton: document.getElementById("addPasskey"),
    form: document.getElementById("addPasskeyForm"),
    name: document.getElementById("passkeyName"),
    cancelButton: document.getElementById("cancelPasskey"),
  };
}

function initAdding(page) {
  page.addButton.addEventListener("click", () => setFormOpen(page, true));
  page.cancelButton.addEventListener("click", () => setFormOpen(page, false));

  page.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await addPasskey(page);
  });
}

/**
 * The form and the buttons it opens from are alternatives, so exactly one of
 * them is on screen at a time.
 */
function setFormOpen(page, open) {
  page.form.hidden = !open;
  page.actions.hidden = open;

  if (open) {
    page.name.focus();
    return;
  }

  page.name.value = "";
  hideMessage(page.message);
}

async function addPasskey(page) {
  showProgress(page.message, "Waiting for your device...");

  try {
    const passkey = await registerPasskey(page.name.value.trim());

    setFormOpen(page, false);
    showSuccess(page.message, `${passkey.name} is ready to sign you in.`);
    await showPasskeys(page);
  } catch (error) {
    console.error("Registering a passkey failed:", error);
    showError(page.message, error.message);
  }
}

async function showPasskeys(page) {
  try {
    const passkeys = await listPasskeys();

    page.list.replaceChildren(...passkeys.map((passkey) => createCard(page, passkey)));
    page.empty.hidden = passkeys.length > 0;
    page.summary.textContent = describeCount(passkeys.length);
  } catch (error) {
    console.error("Could not load the passkeys:", error);
    showError(page.message, error.message);
  }
}

function describeCount(count) {
  if (count === 0) {
    return NO_PASSKEYS_SUMMARY;
  }

  return count === 1 ? "1 passkey" : `${count} passkeys`;
}

function createCard(page, passkey) {
  const name = document.createElement("p");
  name.className = "passkey-card__name";
  name.textContent = passkey.name;

  const added = document.createElement("p");
  added.className = "passkey-card__meta";
  added.textContent = `Added ${formatDate(passkey.dateAdded)}`;

  const body = document.createElement("div");
  body.append(name, added);

  const remove = document.createElement("button");
  remove.className = "btn-ghost";
  remove.type = "button";
  remove.textContent = "Remove";
  remove.addEventListener("click", () => confirmRemoval(page, passkey));

  const card = document.createElement("li");
  card.className = "passkey-card";
  card.append(body, remove);

  return card;
}

async function confirmRemoval(page, passkey) {
  const agreed = await askToConfirm(
    `Remove ${passkey.name}?`,
    "This device will no longer sign you in. Your password still will.",
  );

  if (!agreed) {
    return;
  }

  try {
    await removePasskey(passkey.id);

    showSuccess(page.message, `${passkey.name} has been removed.`);
    await showPasskeys(page);
  } catch (error) {
    console.error("Removing a passkey failed:", error);
    showError(page.message, error.message);
  }
}
