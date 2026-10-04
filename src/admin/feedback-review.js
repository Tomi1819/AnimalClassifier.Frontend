import {
  acceptFeedback,
  exportTrainingData,
  getFeedbackForReview,
  getFeedbackSummary,
  rejectFeedback,
} from "../api/admin.js";
import { resolveUrl } from "../api/client.js";
import { REVIEW_STATUS, VERDICT } from "../api/feedback.js";
import { createElement, createGhostButton } from "../shared/dom.js";
import { hideMessage, showError, showSuccess } from "../shared/feedback.js";
import { formatCount, formatDate, formatFileDate } from "../shared/format.js";
import { showImage } from "../shared/image-viewer.js";
import { renderPager } from "../shared/pager.js";
import { saveFile } from "../shared/save-file.js";
import { createBadge, createCell, createEmptyRow } from "./table.js";

const REVIEW_COLUMNS = 6;

const EMPTY_REVIEW = {
  [REVIEW_STATUS.PENDING]: "Nothing is waiting for review.",
  [REVIEW_STATUS.ACCEPTED]: "Nothing has been accepted yet.",
  [REVIEW_STATUS.REJECTED]: "Nothing has been rejected.",
};

const DECISIONS = {
  accept: { label: "Accept", done: "Accepted for training.", apply: acceptFeedback },
  reject: { label: "Reject", done: "Kept out of training.", apply: rejectFeedback },
};

// How each verdict reads beside the animal the image would be trained as.
const VERDICT_NOTES = {
  [VERDICT.CORRECT]: "Confirmed",
  [VERDICT.WRONG_ANIMAL]: "Corrected",
  [VERDICT.UNLISTED_ANIMAL]: "Corrected",
};

// Stands in for a value there is none of, such as a comment never written.
const NOTHING = "—";

/**
 * The admin page's review of the feedback users offer for training: what the
 * feedback says of the model, the feedback waiting for a decision and the
 * decisions made, and the download of what was accepted.
 */
export async function initFeedbackReview() {
  const section = collectSectionElements();
  const review = { status: REVIEW_STATUS.PENDING, page: 1 };

  initStatusFilter(section, review);
  section.exportButton.addEventListener("click", () => downloadTrainingData(section));

  await Promise.all([showSummary(section), showReview(section, review)]);
}

function collectSectionElements() {
  return {
    status: document.getElementById("reviewStatus"),
    total: document.getElementById("feedbackTotal"),
    agreement: document.getElementById("feedbackAgreement"),
    pending: document.getElementById("feedbackPending"),
    accepted: document.getElementById("feedbackAccepted"),
    mistakes: document.getElementById("commonMistakes"),
    requested: document.getElementById("requestedAnimals"),
    filters: document.querySelectorAll("[data-review-status]"),
    body: document.getElementById("reviewBody"),
    pager: document.getElementById("reviewPager"),
    exportButton: document.getElementById("exportTrainingData"),
    exportStatus: document.getElementById("exportTrainingDataStatus"),
  };
}

/* -------------------------------------------------------------------------
   Summary
   ------------------------------------------------------------------------- */

async function showSummary(section) {
  let summary;

  try {
    summary = await getFeedbackSummary();
  } catch (error) {
    console.error("Could not load the feedback summary:", error);
    showError(section.status, error.message);
    return;
  }

  section.total.textContent = formatCount(summary.totalCount);
  section.agreement.textContent = formatAgreement(summary);
  section.pending.textContent = formatCount(summary.pendingCount);
  section.accepted.textContent = formatCount(summary.acceptedCount);

  renderInsights(
    section.mistakes,
    summary.commonMistakes.map(({ recognizedAnimal, actualAnimal, count }) => ({
      text: `Said ${recognizedAnimal}, was ${actualAnimal}`,
      count,
    })),
    "No mistakes reported yet.",
  );
  renderInsights(
    section.requested,
    summary.requestedAnimals.map(({ animal, count }) => ({ text: animal, count })),
    "Nobody has named an animal the model does not know.",
  );
}

// How often users say the model was right, which means nothing until someone
// has said anything.
function formatAgreement({ totalCount, correctCount }) {
  return totalCount > 0 ? `${Math.round((correctCount / totalCount) * 100)}%` : NOTHING;
}

function renderInsights(list, insights, emptyText) {
  if (insights.length === 0) {
    list.replaceChildren(createElement("li", "insights__empty", emptyText));
    return;
  }

  list.replaceChildren(
    ...insights.map(({ text, count }) => {
      const item = createElement("li", "insights__item");
      item.append(createElement("span", "insights__text", text), createElement("span", "insights__count", formatCount(count)));
      return item;
    }),
  );
}

/* -------------------------------------------------------------------------
   Review
   ------------------------------------------------------------------------- */

// A pressed button is how a group of toggles announces which one is on.
function initStatusFilter(section, review) {
  for (const filter of section.filters) {
    filter.addEventListener("click", () => {
      for (const other of section.filters) {
        const isSelected = other === filter;
        other.classList.toggle("is-active", isSelected);
        other.setAttribute("aria-pressed", String(isSelected));
      }

      review.status = filter.dataset.reviewStatus;
      review.page = 1;
      showReview(section, review);
    });
  }
}

async function showReview(section, review) {
  let result;

  try {
    result = await getFeedbackForReview(review.status, review.page);
  } catch (error) {
    console.error("Could not load the feedback to review:", error);
    showError(section.status, error.message);
    return;
  }

  // Deciding the last one on a page leaves it empty, so the one before it is
  // shown instead.
  if (result.items.length === 0 && review.page > 1) {
    review.page -= 1;
    await showReview(section, review);
    return;
  }

  section.body.replaceChildren(
    ...(result.items.length > 0
      ? result.items.map((item) => createReviewRow(section, review, item))
      : [createEmptyRow(EMPTY_REVIEW[review.status], REVIEW_COLUMNS)]),
  );
  renderPager(section.pager, result, (next) => {
    review.page = next;
    showReview(section, review);
  });
}

function createReviewRow(section, review, item) {
  const actions = createCell(
    ...availableDecisions(item.reviewStatus).map((decision) =>
      createGhostButton(DECISIONS[decision].label, () => decide(section, review, item, decision)),
    ),
  );
  actions.className = "admin-table__actions";

  const row = document.createElement("tr");
  row.append(
    createCell(createThumbnail(item)),
    createCell(
      createElement("span", "admin-table__name review__animal", item.recognizedAnimal),
      createElement("span", "admin-table__email", `${Math.round(item.predictionScore * 100)}% sure`),
    ),
    createCell(...describeLabel(item)),
    createCell(createElement("span", "review__comment", item.comment ?? NOTHING)),
    createCell(formatDate(item.dateSubmitted)),
    actions,
  );
  return row;
}

// Larger on a click, since deciding means looking closely.
function createThumbnail({ imagePath, recognizedAnimal }) {
  const url = resolveUrl(imagePath);

  const image = createElement("img", "review__image");
  image.src = url;
  image.alt = "";

  const button = createElement("button", "review__zoom");
  button.type = "button";
  button.setAttribute("aria-label", `View the image recognised as ${recognizedAnimal} larger`);
  button.append(image);
  button.addEventListener("click", () => showImage(url, recognizedAnimal));
  return button;
}

// An animal the model does not know would be a new one for it to learn, which
// is a bigger decision than another image of one it does.
function describeLabel({ label, verdict, isKnownAnimal }) {
  return [
    createElement("span", "admin-table__name review__animal", label),
    isKnownAnimal
      ? createElement("span", "admin-table__email", VERDICT_NOTES[verdict] ?? verdict)
      : createBadge("New animal", "badge badge--new"),
  ];
}

function availableDecisions(status) {
  switch (status) {
    case REVIEW_STATUS.ACCEPTED:
      return ["reject"];
    case REVIEW_STATUS.REJECTED:
      return ["accept"];
    default:
      return ["accept", "reject"];
  }
}

// Not asked to confirm, as a decision is taken back as easily as it is made.
async function decide(section, review, item, decision) {
  const { label, done, apply } = DECISIONS[decision];

  try {
    await apply(item.id);
  } catch (error) {
    console.error(`Could not ${label.toLowerCase()} the feedback:`, error);
    showError(section.status, error.message);
    return;
  }

  showSuccess(section.status, done);
  await Promise.all([showSummary(section), showReview(section, review)]);
}

/* -------------------------------------------------------------------------
   Training data
   ------------------------------------------------------------------------- */

async function downloadTrainingData(section) {
  // The backend allows only a few downloads in a while, and a second click
  // would spend one on a copy already on its way.
  if (section.exportButton.getAttribute("aria-busy") === "true") {
    return;
  }

  setBusy(section, true);
  hideMessage(section.status);

  try {
    saveFile(await exportTrainingData(), `animal-classifier-training-${formatFileDate()}.zip`);
  } catch (error) {
    console.error("Downloading the training data failed:", error);
    showError(section.status, error.message);
  } finally {
    setBusy(section, false);
  }
}

// Marked busy rather than disabled, which would drop a keyboard user's focus.
function setBusy(section, busy) {
  section.exportButton.setAttribute("aria-busy", String(busy));
  section.exportButton.setAttribute("aria-disabled", String(busy));
  section.exportStatus.textContent = busy ? "Preparing the training data..." : "";
}
