import { exportData } from "../auth/account.js";
import { hideMessage, showError } from "../shared/feedback.js";
import { formatFileDate } from "../shared/format.js";
import { saveFile } from "../shared/save-file.js";

const PREPARING_MESSAGE = "Preparing your data...";

/**
 * Downloads a copy of everything the account holds. It is a single action
 * with nothing to fill in and nothing it changes, so the row neither opens nor
 * asks to confirm.
 */
export function initExportDataSection() {
  const section = collectSectionElements();

  section.button.addEventListener("click", () => download(section));
}

function collectSectionElements() {
  return {
    button: document.getElementById("exportData"),
    status: document.getElementById("exportDataStatus"),
    message: document.getElementById("exportDataMessage"),
  };
}

async function download(section) {
  // The backend allows only a few exports in a while, and a second click
  // would spend one on a copy the user is already getting.
  if (isBusy(section)) {
    return;
  }

  setBusy(section, true);
  hideMessage(section.message);

  try {
    // Nothing is said once the browser has the file. Its own prompt or
    // download bar takes over, and the page is never told whether the file
    // was saved or the prompt cancelled.
    saveFile(await exportData(), exportFileName());
  } catch (error) {
    console.error("Exporting the data failed:", error);
    // Asking too often is explained by the backend's message.
    showError(section.message, error.message);
  } finally {
    setBusy(section, false);
  }
}

function isBusy(section) {
  return section.button.getAttribute("aria-busy") === "true";
}

// Marked busy rather than disabled, because Chrome drops the focus of a
// button that is disabled, and a keyboard user would lose their place.
function setBusy(section, busy) {
  section.button.setAttribute("aria-busy", String(busy));
  section.button.setAttribute("aria-disabled", String(busy));
  section.status.textContent = busy ? PREPARING_MESSAGE : "";
}

function exportFileName() {
  return `animal-classifier-data-${formatFileDate()}.zip`;
}
