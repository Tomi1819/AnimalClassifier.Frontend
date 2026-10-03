import { clearHistory, getHistory } from "../api/recognitions.js";
import { initResultCard } from "../dashboard/result-card.js";
import { initUploadForms } from "../dashboard/upload-form.js";
import { hideMessage, showError } from "../shared/feedback.js";
import { createHistoryCard, fromHistoryItem } from "../shared/history.js";
import { initPage, PAGE_ACCESS } from "../shared/page.js";

if (initPage(PAGE_ACCESS.SIGNED_IN)) {
  const page = collectPageElements();
  const resultCard = initResultCard();

  initUploadForms({
    status: page.uploadStatus,
    onRecognised: (recognition) => addRecognition(page, resultCard, recognition),
  });
  initClearButton(page, resultCard);
  await showHistory(page, resultCard);
}

function collectPageElements() {
  return {
    uploadStatus: document.getElementById("uploadStatus"),
    historyList: document.getElementById("historyList"),
    historyEmpty: document.getElementById("historyEmpty"),
    clearHistory: document.getElementById("clearHistory"),
  };
}

/* -------------------------------------------------------------------------
   History

   The history lives on the server, so it is the same in every tab and on every
   device. An upload and a stored entry render through the same path, so the
   page looks the same whether the result has just arrived or was loaded back.
   Only the animations differ.
   ------------------------------------------------------------------------- */

async function showHistory(page, resultCard) {
  let recognitions;

  try {
    const history = await getHistory();
    recognitions = history.map(fromHistoryItem);
  } catch (error) {
    console.error("Could not load the history:", error);
    page.historyEmpty.textContent = error.message;
    return;
  }

  if (recognitions.length === 0) {
    return;
  }

  const [latest] = recognitions;
  // A stored result is not new, so it appears settled rather than counting and
  // filling as though it had just been recognised.
  resultCard.show(latest, { animate: false });
  page.historyList.replaceChildren(...recognitions.map(createHistoryCard));
  showHistoryControls(page);
}

function addRecognition(page, resultCard, recognition) {
  resultCard.show(recognition, { animate: true });
  page.historyList.prepend(createHistoryCard(recognition));
  showHistoryControls(page);
}

function showHistoryControls(page) {
  page.historyEmpty.hidden = true;
  page.clearHistory.hidden = false;
}

function initClearButton(page, resultCard) {
  page.clearHistory.addEventListener("click", async () => {
    page.clearHistory.disabled = true;

    try {
      // The recognitions are kept on the server, where the search and
      // statistics pages still count them; only this history is cleared.
      await clearHistory();
    } catch (error) {
      console.error("Could not clear the history:", error);
      showError(page.uploadStatus, error.message);
      return;
    } finally {
      page.clearHistory.disabled = false;
    }

    page.historyList.replaceChildren();
    page.historyEmpty.hidden = false;
    page.clearHistory.hidden = true;
    resultCard.hide();
    hideMessage(page.uploadStatus);
  });
}
