import { apiFetch, resolveUrl } from "../api/client.js";
import { requireAuthentication } from "../auth/session.js";
import { showError, showProgress, showSuccess } from "../shared/feedback.js";
import { initNavigation } from "../shared/nav.js";

const LOW_CONFIDENCE_THRESHOLD = 0.5;
// Counters run for a fixed span, so a long video does not take longer to
// count than it did to analyse.
const COUNTER_ANIMATION_MS = 1200;
const SCORE_ANIMATION_DELAY_MS = 500;
const SCORE_ANIMATION_STAGGER_MS = 200;

// Module scripts are deferred, so the document is already parsed here.
// The guard runs first, so an expired session never paints the signed-in nav.
if (requireAuthentication()) {
  initNavigation();

  const elements = collectElements();
  initTabs(elements);
  initImageUpload(elements);
  initVideoUpload(elements);
}

function collectElements() {
  return {
    imageTabBtn: document.getElementById("imageTabBtn"),
    videoTabBtn: document.getElementById("videoTabBtn"),
    imageUploadTab: document.getElementById("imageUploadTab"),
    videoUploadTab: document.getElementById("videoUploadTab"),
    imageUploadForm: document.getElementById("imageUploadForm"),
    imageFileInput: document.getElementById("imageFileUpload"),
    imageUploadButton: document.getElementById("imageUploadButton"),
    videoUploadForm: document.getElementById("videoUploadForm"),
    videoFileInput: document.getElementById("videoFileUpload"),
    videoUploadButton: document.getElementById("videoUploadButton"),
    uploadStatus: document.getElementById("uploadStatus"),
    resultSection: document.getElementById("resultSection"),
    resultImage: document.getElementById("resultImage"),
    resultVideo: document.getElementById("resultVideo"),
    mediaContainer: document.getElementById("mediaContainer"),
    predictedLabel: document.getElementById("predictedLabel"),
    dateRecognized: document.getElementById("dateRecognized"),
    predictionScore: document.getElementById("predictionScore"),
    lowConfidenceMessage: document.getElementById("lowConfidenceMessage"),
    historyList: document.getElementById("historyList"),
  };
}

function initTabs({ imageTabBtn, videoTabBtn, imageUploadTab, videoUploadTab }) {
  imageTabBtn.addEventListener("click", () => {
    imageTabBtn.classList.add("active");
    videoTabBtn.classList.remove("active");
    imageUploadTab.style.display = "block";
    videoUploadTab.style.display = "none";
  });

  videoTabBtn.addEventListener("click", () => {
    videoTabBtn.classList.add("active");
    imageTabBtn.classList.remove("active");
    videoUploadTab.style.display = "block";
    imageUploadTab.style.display = "none";
  });
}

function initImageUpload(elements) {
  const { imageUploadForm, imageFileInput, imageUploadButton, uploadStatus } = elements;

  imageUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = imageFileInput.files[0];
    if (!file) {
      showError(uploadStatus, "Please select an image file.");
      return;
    }

    showProgress(uploadStatus, "Uploading image...");
    imageUploadButton.disabled = true;

    try {
      const result = await uploadFile("/api/upload/image", "formFile", file);
      showImageResult(elements, result);
      showSuccess(uploadStatus, "Image upload successful!");
    } catch (error) {
      console.error("Image upload failed:", error);
      // The error explains itself, so an offline backend is not reported as a
      // problem with the file the user chose.
      showError(uploadStatus, error.message);
    } finally {
      imageUploadButton.disabled = false;
    }
  });
}

function initVideoUpload(elements) {
  const { videoUploadForm, videoFileInput, videoUploadButton, uploadStatus } = elements;

  videoUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const file = videoFileInput.files[0];
    if (!file) {
      showError(uploadStatus, "Please select a video file.");
      return;
    }

    showProgress(uploadStatus, "Uploading video...");
    videoUploadButton.disabled = true;

    try {
      const result = await uploadFile("/api/upload/video", "videoFile", file);
      showVideoResult(elements, result);
      showSuccess(uploadStatus, "Video upload successful!");
    } catch (error) {
      console.error("Video upload failed:", error);
      showError(uploadStatus, error.message);
    } finally {
      videoUploadButton.disabled = false;
    }
  });
}

function uploadFile(path, fieldName, file) {
  const formData = new FormData();
  formData.append(fieldName, file);

  return apiFetch(path, { method: "POST", body: formData });
}

function showImageResult(elements, result) {
  const { resultImage, resultVideo, resultSection } = elements;
  const imageUrl = resolveUrl(result.imagePath);
  const recognizedAt = new Date(result.dateRecognized).toLocaleString();

  resultImage.src = imageUrl;
  resultImage.style.display = "block";
  resultVideo.style.display = "none";
  removeVideoStats();
  setSinglePredictionVisible(resultSection, true);

  elements.predictedLabel.textContent = result.recognizedAnimal;
  elements.dateRecognized.textContent = recognizedAt;
  elements.predictionScore.textContent = `${(result.predictionScore * 100).toFixed(2)}%`;
  elements.lowConfidenceMessage.style.display =
    result.predictionScore < LOW_CONFIDENCE_THRESHOLD ? "block" : "none";

  resultSection.style.display = "block";

  prependHistoryItem(elements.historyList, {
    type: "image",
    url: imageUrl,
    animal: result.recognizedAnimal,
    date: recognizedAt,
  });
}

function showVideoResult(elements, result) {
  const { resultImage, resultVideo, resultSection, mediaContainer } = elements;
  const videoUrl = resolveUrl(result.videoPath);
  const recognizedAt = new Date().toLocaleString();

  resultVideo.src = videoUrl;
  resultVideo.style.display = "block";
  resultImage.style.display = "none";
  removeVideoStats();
  setSinglePredictionVisible(resultSection, false);

  elements.dateRecognized.textContent = recognizedAt;
  resultSection.style.display = "block";

  const videoStats = createVideoStats(result);
  mediaContainer.after(videoStats);

  animateFrameCounter(videoStats, result.framesProcessed);
  renderDetectedAnimals(videoStats, result.topAnimals);

  const [topAnimal] = result.topAnimals;
  prependHistoryItem(elements.historyList, {
    type: "video",
    url: videoUrl,
    animal: topAnimal?.animal ?? "Unknown",
    date: recognizedAt,
    framesProcessed: result.framesProcessed,
    allAnimals: result.topAnimals.map((entry) => entry.animal).join(", "),
  });
}

function removeVideoStats() {
  document.getElementById("videoStats")?.remove();
}

// The recognised animal and accuracy paragraphs describe a single prediction,
// which a video result does not have.
function setSinglePredictionVisible(resultSection, visible) {
  const paragraphs = resultSection.querySelectorAll("p");
  const display = visible ? "block" : "none";

  if (paragraphs.length >= 3) {
    paragraphs[0].style.display = display;
    paragraphs[2].style.display = display;
  }
}

function createVideoStats({ topAnimals }) {
  const container = document.createElement("div");
  container.id = "videoStats";
  container.className = "video-stats";
  container.innerHTML = `
    <div class="frames-counter">
      <div class="counter-label">Frames Processed</div>
      <div class="counter-value" id="framesCount">0</div>
      <div class="counter-progress">
        <div class="progress-bar" id="framesProgressBar"></div>
      </div>
    </div>
    <div class="animals-detected">
      <h3>Animals Detected (${topAnimals.length})</h3>
      <div class="animals-grid" id="animalsGrid"></div>
    </div>
  `;

  return container;
}

function animateFrameCounter(videoStats, targetFrames) {
  const counter = videoStats.querySelector("#framesCount");
  const progressBar = videoStats.querySelector("#framesProgressBar");

  animateCount(targetFrames, (frames, progress) => {
    counter.textContent = frames;
    progressBar.style.width = `${progress * 100}%`;
  });
}

/**
 * Counts up to `target` over a fixed duration, reporting the current value and
 * how far along it is. A target of zero, which the backend reports for a video
 * it could not read, simply settles there instead of counting forever.
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
  const grid = videoStats.querySelector("#animalsGrid");

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
  card.style.animationDelay = `${index * 0.2}s`;

  const icon = document.createElement("div");
  icon.className = `animal-icon ${animal.toLowerCase()}`;
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" class="animal-svg">
      <circle cx="12" cy="12" r="10" fill="#f0f0f0"></circle>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-size="8px"></text>
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

function prependHistoryItem(historyList, item) {
  const container = document.createElement("li");
  container.className = "history-item-container";
  container.append(item.type === "image" ? createImageHistory(item) : createVideoHistory(item));
  historyList.prepend(container);
}

function createImageHistory({ url, animal, date }) {
  const preview = document.createElement("img");
  preview.src = url;
  preview.alt = "Image";
  preview.width = 100;

  return createHistoryItem(preview, animal, [
    { className: "date", text: date },
    { className: "result", text: "Type: Image" },
  ]);
}

function createVideoHistory({ url, animal, date, framesProcessed, allAnimals }) {
  const preview = document.createElement("video");
  preview.width = 100;
  preview.height = 100;
  preview.src = url;

  return createHistoryItem(preview, animal, [
    { className: "date", text: date },
    { className: "result", text: `Video: ${framesProcessed} frames analyzed` },
    { className: "animals-found", text: allAnimals },
  ]);
}

function createHistoryItem(preview, animal, rows) {
  const heading = document.createElement("h4");
  heading.textContent = animal;

  const details = document.createElement("div");
  details.className = "history-details";
  details.append(heading, ...rows.map(createDetailRow));

  const item = document.createElement("div");
  item.className = "history-item";
  item.append(preview, details);
  return item;
}

function createDetailRow({ className, text }) {
  const row = document.createElement("div");
  row.className = className;
  row.textContent = text;
  return row;
}
