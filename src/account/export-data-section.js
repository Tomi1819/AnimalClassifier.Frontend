import { exportData } from "../auth/account.js";
import { showError, showProgress, showSuccess } from "../shared/feedback.js";
import { saveFile } from "../shared/save-file.js";

const DOWNLOADED_MESSAGE = "Your data has been downloaded.";

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
    message: document.getElementById("exportDataMessage"),
  };
}

async function download(section) {
  // The backend allows only a few exports in a while, and a second click
  // would spend one on a copy the user is already getting.
  section.button.disabled = true;
  showProgress(section.message, "Preparing your data...");

  try {
    saveFile(await exportData(), exportFileName());
    showSuccess(section.message, DOWNLOADED_MESSAGE);
  } catch (error) {
    console.error("Exporting the data failed:", error);
    // Asking too often is explained by the backend's message.
    showError(section.message, error.message);
  } finally {
    section.button.disabled = false;
  }
}

// Dated by the user's own calendar, so that copies from different days sit
// side by side under the day they were made.
function exportFileName() {
  const today = new Date();
  const date = [today.getFullYear(), today.getMonth() + 1, today.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");

  return `animal-classifier-data-${date}.zip`;
}
