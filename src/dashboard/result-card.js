import { formatDate } from "../shared/format.js";
import { renderVideoBreakdown } from "./video-breakdown.js";

const LOW_CONFIDENCE_THRESHOLD = 0.5;
const HIGH_CONFIDENCE_THRESHOLD = 0.75;

/**
 * The card at the top of the dashboard that shows the latest recognition: the
 * image or video, and what the model made of it.
 *
 * @returns `show(recognition, { animate })` and `hide()`. A result that has
 *   just arrived is shown animated; one loaded back from the history appears
 *   settled, as it is not new.
 */
export function initResultCard() {
  const card = collectCardElements();

  return {
    show: (recognition, options) => render(card, recognition, options),
    hide: () => {
      card.section.hidden = true;
      card.videoStatsSlot.replaceChildren();
    },
  };
}

function collectCardElements() {
  return {
    section: document.getElementById("resultSection"),
    image: document.getElementById("resultImage"),
    video: document.getElementById("resultVideo"),
    predictedLabel: document.getElementById("predictedLabel"),
    dateRecognized: document.getElementById("dateRecognized"),
    predictionScore: document.getElementById("predictionScore"),
    confidenceBlock: document.getElementById("confidenceBlock"),
    confidenceFill: document.getElementById("confidenceFill"),
    lowConfidenceMessage: document.getElementById("lowConfidenceMessage"),
    videoStatsSlot: document.getElementById("videoStatsSlot"),
  };
}

function render(card, recognition, { animate }) {
  const isVideo = recognition.type === "video";

  card.image.hidden = isVideo;
  card.video.hidden = !isVideo;
  (isVideo ? card.video : card.image).src = recognition.url;

  card.dateRecognized.textContent = formatDate(recognition.date);
  card.videoStatsSlot.replaceChildren();

  if (isVideo) {
    // A video has no single prediction, so the animal heading and the
    // accuracy meter give way to the per-animal breakdown.
    card.predictedLabel.hidden = true;
    card.confidenceBlock.hidden = true;
    card.lowConfidenceMessage.hidden = true;
    renderVideoBreakdown(card.videoStatsSlot, recognition, animate);
  } else {
    renderPrediction(card, recognition, animate);
  }

  card.section.hidden = false;
}

function renderPrediction(card, recognition, animate) {
  card.predictedLabel.textContent = recognition.animal;
  card.predictedLabel.hidden = false;

  // Recognitions stored before the score was recorded have none, so the meter
  // is left out rather than reporting them as a confident failure.
  const hasScore = recognition.score > 0;
  card.confidenceBlock.hidden = !hasScore;
  card.lowConfidenceMessage.hidden =
    !hasScore || recognition.score >= LOW_CONFIDENCE_THRESHOLD;

  if (!hasScore) {
    return;
  }

  const percentage = recognition.score * 100;
  card.confidenceBlock.className = `confidence ${confidenceVariant(recognition.score)}`;
  card.predictionScore.textContent = `${percentage.toFixed(2)}%`;

  if (!animate) {
    card.confidenceFill.style.width = `${percentage}%`;
    return;
  }

  // Restarting from zero on the next frame lets the width transition run,
  // rather than the bar jumping straight to its new length.
  card.confidenceFill.style.width = "0%";
  requestAnimationFrame(() => {
    card.confidenceFill.style.width = `${percentage}%`;
  });
}

function confidenceVariant(score) {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) {
    return "confidence--high";
  }

  return score >= LOW_CONFIDENCE_THRESHOLD ? "confidence--medium" : "confidence--low";
}
