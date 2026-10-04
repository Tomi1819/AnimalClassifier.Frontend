import { resolveUrl } from "../api/client.js";
import { getFeedback } from "../api/feedback.js";
import { createFeedbackPanel } from "../feedback/feedback-panel.js";
import { createElement } from "../shared/dom.js";
import { showError } from "../shared/feedback.js";
import { formatDate } from "../shared/format.js";
import { showImage } from "../shared/image-viewer.js";
import { initPage, PAGE_ACCESS } from "../shared/page.js";
import { renderPager } from "../shared/pager.js";

// The page of feedback on screen, which withdrawing one reloads.
let feedbackPage = 1;

if (initPage(PAGE_ACCESS.SIGNED_IN)) {
  await showFeedback(collectPageElements(), 1);
}

function collectPageElements() {
  return {
    status: document.getElementById("feedbackStatus"),
    empty: document.getElementById("feedbackEmpty"),
    list: document.getElementById("feedbackList"),
    pager: document.getElementById("feedbackPager"),
  };
}

async function showFeedback(page, pageNumber) {
  let result;

  try {
    result = await getFeedback(pageNumber);
  } catch (error) {
    console.error("Could not load the feedback:", error);
    showError(page.status, error.message);
    return;
  }

  // Withdrawing the last feedback on a page leaves it empty, so the one
  // before it is shown instead.
  if (result.items.length === 0 && pageNumber > 1) {
    await showFeedback(page, pageNumber - 1);
    return;
  }

  feedbackPage = pageNumber;
  page.list.replaceChildren(...result.items.map((item) => createItem(page, item)));
  page.empty.hidden = result.totalCount > 0;
  page.pager.hidden = result.totalCount <= result.pageSize;
  renderPager(page.pager, result, (next) => showFeedback(page, next));
}

function createItem(page, { recognitionId, imagePath, recognizedAnimal, predictionScore, dateRecognized, feedback }) {
  const url = resolveUrl(imagePath);

  const image = document.createElement("img");
  image.className = "feedback-item__image";
  image.src = url;
  image.alt = "";

  const zoom = createElement("button", "feedback-item__zoom");
  zoom.type = "button";
  zoom.setAttribute("aria-label", `View the image of the ${recognizedAnimal} larger`);
  zoom.append(image);
  zoom.addEventListener("click", () => showImage(url, recognizedAnimal));

  const body = createElement("div", "feedback-item__body");
  body.append(
    createElement("h3", "feedback-item__animal", recognizedAnimal),
    createElement(
      "p",
      "feedback-item__meta",
      `Recognised ${formatDate(dateRecognized)} · ${Math.round(predictionScore * 100)}% sure`,
    ),
    createFeedbackPanel(
      { id: recognitionId, feedback },
      {
        // A withdrawn feedback has nothing left to show here.
        onChange: (changed) => {
          if (!changed) {
            showFeedback(page, feedbackPage);
          }
        },
      },
    ),
  );

  const item = createElement("li", "feedback-item");
  item.append(zoom, body);
  return item;
}
