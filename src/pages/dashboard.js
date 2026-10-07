import { clearHistory, getHistory } from "../api/recognitions.js";
import { initResultCard } from "../dashboard/result-card.js";
import { initUploadForms } from "../dashboard/upload-form.js";
import { hideMessage, showError } from "../shared/feedback.js";
import { createHistoryCard, fromHistoryItem } from "../shared/history.js";
import { initPage, PAGE_ACCESS } from "../shared/page.js";
import { renderPager } from "../shared/pager.js";

// The page of the history on screen, and how long the whole history is, which
// an upload adds to. Until the history loads nothing is known of its pages,
// so an upload is only added to the top.
let shownHistory = { page: 1, pageSize: Infinity, totalCount: 0 };

if (initPage(PAGE_ACCESS.SIGNED_IN)) {
  const page = collectPageElements();
  const resultCard = initResultCard({
    onFeedbackChange: (recognition) => replaceHistoryCard(page, resultCard, recognition),
  });

  initUploadForms({
    status: page.uploadStatus,
    onRecognised: (recognition) => addRecognition(page, resultCard, recognition),
  });
  initClearButton(page, resultCard);

  const [latest] = await showHistory(page, resultCard, 1);
  // A stored result is not new, so it appears settled rather than counting and
  // filling as though it had just been recognised.
  if (latest) {
    resultCard.show(latest, { animate: false });
  }
}

function collectPageElements() {
  return {
    uploadStatus: document.getElementById("uploadStatus"),
    resultSection: document.getElementById("resultSection"),
    historyList: document.getElementById("historyList"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyPager: document.getElementById("historyPager"),
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

// Answers with the recognitions it shows, most recent first, which are none
// when the history could not be loaded.
async function showHistory(page, resultCard, pageNumber) {
  let result;

  try {
    result = await getHistory(pageNumber);
  } catch (error) {
    console.error("Could not load the history:", error);
    page.historyEmpty.textContent = error.message;
    page.historyEmpty.hidden = false;
    return [];
  }

  const recognitions = result.items.map(fromHistoryItem);

  shownHistory = { page: result.page, pageSize: result.pageSize, totalCount: result.totalCount };
  page.historyList.replaceChildren(
    ...recognitions.map((recognition) => createEntry(page, resultCard, recognition)),
  );
  renderHistoryPager(page, resultCard);

  if (result.totalCount > 0) {
    showHistoryControls(page);
  }

  return recognitions;
}

// The newest entry tops the first page, pushing its last one onto the next.
// Another page keeps its entries until it is turned.
function addRecognition(page, resultCard, recognition) {
  resultCard.show(recognition, { animate: true });

  shownHistory.totalCount += 1;
  if (shownHistory.page === 1) {
    page.historyList.prepend(createEntry(page, resultCard, recognition));
    page.historyList.children[shownHistory.pageSize]?.remove();
  }

  renderHistoryPager(page, resultCard);
  showHistoryControls(page);
}

function renderHistoryPager(page, resultCard) {
  page.historyPager.hidden = shownHistory.totalCount <= shownHistory.pageSize;
  renderPager(page.historyPager, shownHistory, (next) => showHistory(page, resultCard, next));
}

// Choosing an entry shows it in the result card, which is where the user says
// whether the model was right about it.
function createEntry(page, resultCard, recognition) {
  return createHistoryCard(recognition, {
    onSelect: () => {
      resultCard.show(recognition, { animate: false });
      page.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  });
}

function replaceHistoryCard(page, resultCard, recognition) {
  page.historyList
    .querySelector(`[data-recognition-id="${recognition.id}"]`)
    ?.replaceWith(createEntry(page, resultCard, recognition));
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

    shownHistory = { ...shownHistory, page: 1, totalCount: 0 };
    page.historyList.replaceChildren();
    renderHistoryPager(page, resultCard);
    page.historyEmpty.hidden = false;
    page.clearHistory.hidden = true;
    resultCard.hide();
    hideMessage(page.uploadStatus);
  });
}
