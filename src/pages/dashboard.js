import { apiFetch, resolveUrl } from "../api/client.js";
import { requireAuthentication } from "../auth/session.js";
import { showError, showProgress, showSuccess } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";

const LOW_CONFIDENCE_THRESHOLD = 0.5;
const HIGH_CONFIDENCE_THRESHOLD = 0.75;
// Counters run for a fixed span, so a long video does not take longer to
// count than it did to analyse.
const COUNTER_ANIMATION_MS = 1200;
const SCORE_ANIMATION_DELAY_MS = 500;
const SCORE_ANIMATION_STAGGER_MS = 200;
const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ["B", "KB", "MB", "GB"];

// The two tabs are the same widget pointed at a different endpoint, so they
// differ only by the ids they own and the wording they use.
const IMAGE_UPLOAD = {
  tab: "imageTabBtn",
  panel: "imageUploadTab",
  dropzone: "imageDropzone",
  input: "imageFileUpload",
  form: "imageUploadForm",
  button: "imageUploadButton",
  summary: "imageFileSummary",
  fileName: "imageFileName",
  fileSize: "imageFileSize",
  thumbnail: "imageThumb",
  path: "/api/upload/image",
  field: "formFile",
  missingFile: "Please select an image file.",
  wrongType: "That file is not a JPG or PNG image.",
  progress: "Uploading image...",
  success: "Image upload successful!",
  showResult: showImageResult,
};

const VIDEO_UPLOAD = {
  tab: "videoTabBtn",
  panel: "videoUploadTab",
  dropzone: "videoDropzone",
  input: "videoFileUpload",
  form: "videoUploadForm",
  button: "videoUploadButton",
  summary: "videoFileSummary",
  fileName: "videoFileName",
  fileSize: "videoFileSize",
  path: "/api/upload/video",
  field: "videoFile",
  missingFile: "Please select a video file.",
  wrongType: "That file is not an MP4, MOV or AVI video.",
  progress: "Uploading video...",
  success: "Video upload successful!",
  showResult: showVideoResult,
};

// Module scripts are deferred, so the document is already parsed here.
// The guard runs first, so an expired session never paints the signed-in nav.
if (requireAuthentication()) {
  initNavigation();

  const page = collectPageElements();
  const tabs = [IMAGE_UPLOAD, VIDEO_UPLOAD].map((config) => initUpload(config, page));
  initTabs(tabs);
}

function collectPageElements() {
  return {
    uploadStatus: document.getElementById("uploadStatus"),
    resultSection: document.getElementById("resultSection"),
    resultImage: document.getElementById("resultImage"),
    resultVideo: document.getElementById("resultVideo"),
    predictedLabel: document.getElementById("predictedLabel"),
    dateRecognized: document.getElementById("dateRecognized"),
    predictionScore: document.getElementById("predictionScore"),
    confidenceBlock: document.getElementById("confidenceBlock"),
    confidenceFill: document.getElementById("confidenceFill"),
    lowConfidenceMessage: document.getElementById("lowConfidenceMessage"),
    videoStatsSlot: document.getElementById("videoStatsSlot"),
    historyList: document.getElementById("historyList"),
    historyEmpty: document.getElementById("historyEmpty"),
  };
}

/* -------------------------------------------------------------------------
   Tabs
   ------------------------------------------------------------------------- */

function initTabs(tabs) {
  tabs.forEach((tab) => {
    tab.button.addEventListener("click", () => {
      tabs.forEach((other) => {
        const isSelected = other === tab;
        other.button.classList.toggle("is-active", isSelected);
        other.panel.hidden = !isSelected;
      });
    });
  });
}

/* -------------------------------------------------------------------------
   Upload
   ------------------------------------------------------------------------- */

function initUpload(config, page) {
  const elements = {
    dropzone: document.getElementById(config.dropzone),
    input: document.getElementById(config.input),
    form: document.getElementById(config.form),
    button: document.getElementById(config.button),
    summary: document.getElementById(config.summary),
    fileName: document.getElementById(config.fileName),
    fileSize: document.getElementById(config.fileSize),
    thumbnail: config.thumbnail ? document.getElementById(config.thumbnail) : null,
  };

  initDropzone(config, elements, page);
  initSubmit(config, elements, page);

  return {
    button: document.getElementById(config.tab),
    panel: document.getElementById(config.panel),
  };
}

function initDropzone(config, elements, page) {
  const { dropzone, input } = elements;

  input.addEventListener("change", () => showSelectedFile(elements, input.files[0]));

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  });

  // `dragleave` also fires when the pointer crosses onto a child element, so
  // the highlight is only dropped once the pointer has left the dropzone.
  dropzone.addEventListener("dragleave", (event) => {
    if (!dropzone.contains(event.relatedTarget)) {
      dropzone.classList.remove("is-dragging");
    }
  });

  dropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");

    const [file] = event.dataTransfer.files;
    if (!file) {
      return;
    }

    if (!isAccepted(file, input.accept)) {
      showError(page.uploadStatus, config.wrongType);
      return;
    }

    // A dropped file has to be handed to the input, which is what the form
    // reads from; assigning `files` does not raise a change event.
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    showSelectedFile(elements, file);
  });
}

// Windows reports no type at all for some AVI files; the backend validates
// the upload regardless, so only a positively wrong type is refused here.
function isAccepted(file, accept) {
  const types = accept.split(",").map((type) => type.trim());
  return !file.type || types.includes(file.type);
}

function showSelectedFile({ dropzone, summary, fileName, fileSize, thumbnail }, file) {
  if (!file) {
    dropzone.classList.remove("has-file");
    summary.hidden = true;
    return;
  }

  fileName.textContent = file.name;
  fileSize.textContent = formatFileSize(file.size);

  if (thumbnail) {
    // The previous preview is released before its URL is replaced, so choosing
    // several files in a row does not retain every one of them.
    URL.revokeObjectURL(thumbnail.src);
    thumbnail.src = URL.createObjectURL(file);
  }

  dropzone.classList.add("has-file");
  summary.hidden = false;
}

function formatFileSize(bytes) {
  let size = bytes;
  let unit = 0;

  while (size >= BYTES_PER_UNIT && unit < SIZE_UNITS.length - 1) {
    size /= BYTES_PER_UNIT;
    unit += 1;
  }

  const rounded = unit === 0 || size >= 10 ? Math.round(size) : size.toFixed(1);
  return `${rounded} ${SIZE_UNITS[unit]}`;
}

function initSubmit(config, elements, page) {
  const { form, input, button } = elements;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = input.files[0];
    if (!file) {
      showError(page.uploadStatus, config.missingFile);
      return;
    }

    showProgress(page.uploadStatus, config.progress);
    button.disabled = true;

    try {
      const formData = new FormData();
      formData.append(config.field, file);

      const result = await apiFetch(config.path, { method: "POST", body: formData });
      config.showResult(page, result);
      showSuccess(page.uploadStatus, config.success);
    } catch (error) {
      console.error(`${config.path} failed:`, error);
      // The error explains itself, so an offline backend is not reported as a
      // problem with the file the user chose.
      showError(page.uploadStatus, error.message);
    } finally {
      button.disabled = false;
    }
  });
}

/* -------------------------------------------------------------------------
   Results
   ------------------------------------------------------------------------- */

function showImageResult(page, result) {
  const imageUrl = resolveUrl(result.imagePath);
  const recognisedAt = new Date(result.dateRecognized).toLocaleString();

  page.resultImage.src = imageUrl;
  page.resultImage.hidden = false;
  page.resultVideo.hidden = true;
  page.videoStatsSlot.replaceChildren();

  page.predictedLabel.textContent = result.recognizedAnimal;
  page.predictedLabel.hidden = false;
  page.dateRecognized.textContent = recognisedAt;
  showConfidence(page, result.predictionScore);

  page.resultSection.hidden = false;

  prependHistoryCard(page, {
    type: "image",
    url: imageUrl,
    animal: result.recognizedAnimal,
    date: recognisedAt,
  });
}

function showVideoResult(page, result) {
  const videoUrl = resolveUrl(result.videoPath);
  const recognisedAt = new Date().toLocaleString();

  page.resultVideo.src = videoUrl;
  page.resultVideo.hidden = false;
  page.resultImage.hidden = true;

  // A video has no single prediction, so the animal heading and the accuracy
  // meter are replaced by the per-animal breakdown below.
  page.predictedLabel.hidden = true;
  page.confidenceBlock.hidden = true;
  page.lowConfidenceMessage.hidden = true;
  page.dateRecognized.textContent = recognisedAt;

  const videoStats = createVideoStats(result);
  page.videoStatsSlot.replaceChildren(videoStats);
  page.resultSection.hidden = false;

  animateFrameCounter(videoStats, result.framesProcessed);
  renderDetectedAnimals(videoStats, result.topAnimals);

  const [topAnimal] = result.topAnimals;
  prependHistoryCard(page, {
    type: "video",
    url: videoUrl,
    animal: topAnimal?.animal ?? "Unknown",
    date: recognisedAt,
    detail: `${result.framesProcessed} frames analysed`,
    animals: result.topAnimals.map((entry) => entry.animal).join(", "),
  });
}

function showConfidence(page, score) {
  const percentage = score * 100;

  page.confidenceBlock.className = `confidence ${confidenceVariant(score)}`;
  page.confidenceBlock.hidden = false;
  page.predictionScore.textContent = `${percentage.toFixed(2)}%`;
  page.lowConfidenceMessage.hidden = score >= LOW_CONFIDENCE_THRESHOLD;

  // Restarting from zero on the next frame lets the width transition run,
  // rather than the bar jumping straight to its new length.
  page.confidenceFill.style.width = "0%";
  requestAnimationFrame(() => {
    page.confidenceFill.style.width = `${percentage}%`;
  });
}

function confidenceVariant(score) {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) {
    return "confidence--high";
  }

  return score >= LOW_CONFIDENCE_THRESHOLD ? "confidence--medium" : "confidence--low";
}

/* -------------------------------------------------------------------------
   Video breakdown
   ------------------------------------------------------------------------- */

function createVideoStats({ topAnimals }) {
  const container = document.createElement("div");
  container.className = "video-stats";
  container.innerHTML = `
    <div class="frames-counter">
      <div class="counter-label">Frames processed</div>
      <div class="counter-value" data-frames-count>0</div>
      <div class="counter-progress">
        <div class="progress-bar" data-frames-progress></div>
      </div>
    </div>
    <div class="animals-detected">
      <h3>Animals detected (${topAnimals.length})</h3>
      <div class="animals-grid" data-animals-grid></div>
    </div>
  `;

  return container;
}

function animateFrameCounter(videoStats, targetFrames) {
  const counter = videoStats.querySelector("[data-frames-count]");
  const progressBar = videoStats.querySelector("[data-frames-progress]");

  animateCount(targetFrames, (frames, progress) => {
    counter.textContent = frames;
    progressBar.style.width = `${progress * 100}%`;
  });
}

/**
 * Counts up to `target` over a fixed duration, reporting the current value and
 * how far along it is. A target the backend could not report, such as a video
 * it failed to read, settles at zero instead of counting forever.
 */
function animateCount(target, onStep) {
  if (!(target > 0)) {
    onStep(0, 1);
    return;
  }

  const start = performance.now();

  const step = (now) => {
    const progress = Math.min((now - start) / COUNTER_ANIMATION_MS, 1);
    onStep(Math.round(target * progress), progress);

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

function renderDetectedAnimals(videoStats, topAnimals) {
  const grid = videoStats.querySelector("[data-animals-grid]");

  topAnimals.forEach((entry, index) => {
    const card = createAnimalCard(entry, index);
    grid.append(card);

    const targetScore = Math.round(parseFloat(entry.averageScore) * 100);
    setTimeout(
      () => animateScore(card, targetScore),
      SCORE_ANIMATION_DELAY_MS + index * SCORE_ANIMATION_STAGGER_MS,
    );
  });
}

function createAnimalCard({ animal }, index) {
  const card = document.createElement("div");
  card.className = "animal-card";
  card.style.animationDelay = `${index * 0.08}s`;

  const icon = document.createElement("div");
  icon.className = `animal-icon ${animal.toLowerCase()}`;
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" class="animal-svg">
      <circle cx="12" cy="12" r="11" fill="#eaf4fd"></circle>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
            font-size="10px" font-weight="700" fill="#005f99"></text>
    </svg>
  `;
  icon.querySelector("text").textContent = animal.charAt(0).toUpperCase();

  const details = document.createElement("div");
  details.className = "animal-details";
  details.innerHTML = `
    <div class="animal-name"></div>
    <div class="animal-score-container">
      <div class="animal-score-bar">
        <div class="animal-score-fill" style="width: 0%"></div>
      </div>
      <div class="animal-score-percentage">0%</div>
    </div>
  `;
  details.querySelector(".animal-name").textContent = animal;

  card.append(icon, details);
  return card;
}

function animateScore(card, targetScore) {
  const fill = card.querySelector(".animal-score-fill");
  const percentage = card.querySelector(".animal-score-percentage");

  animateCount(targetScore, (score) => {
    fill.style.width = `${score}%`;
    percentage.textContent = `${score}%`;
  });
}

/* -------------------------------------------------------------------------
   History
   ------------------------------------------------------------------------- */

function prependHistoryCard(page, entry) {
  page.historyEmpty.hidden = true;
  page.historyList.prepend(createHistoryCard(entry));
}

function createHistoryCard({ type, url, animal, date, detail, animals }) {
  const isVideo = type === "video";

  const media = document.createElement(isVideo ? "video" : "img");
  media.className = "history-card__media";
  media.src = url;
  if (!isVideo) {
    media.alt = animal;
  }

  const badge = document.createElement("span");
  badge.className = isVideo ? "badge badge--video" : "badge";
  badge.textContent = isVideo ? "Video" : "Image";

  const title = document.createElement("h4");
  title.className = "history-card__title";
  title.textContent = animal;

  const meta = document.createElement("p");
  meta.className = "history-card__meta";
  meta.textContent = detail ? `${date} · ${detail}` : date;

  const body = document.createElement("div");
  body.className = "history-card__body";
  body.append(badge, title, meta);

  if (animals) {
    const extra = document.createElement("p");
    extra.className = "history-card__extra";
    extra.textContent = animals;
    body.append(extra);
  }

  const card = document.createElement("li");
  card.className = "history-card";
  card.append(media, body);
  return card;
}
