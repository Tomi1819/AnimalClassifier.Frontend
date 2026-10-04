// Counters run for a fixed span, so a long video does not take longer to
// count than it did to analyse.
const COUNTER_ANIMATION_MS = 1200;
const SCORE_ANIMATION_DELAY_MS = 500;
const SCORE_ANIMATION_STAGGER_MS = 200;

/**
 * What a video was found to show, in place of the single prediction an image
 * has: how many frames were read, and each animal seen, with its score.
 *
 * @param slot the element the breakdown is drawn into, replacing what it held.
 * @param recognition the video's recognition. Only one that has just been
 *   uploaded carries `topAnimals`, since the history keeps only the strongest.
 * @param animate whether the figures count up, as they do for a new result.
 */
export function renderVideoBreakdown(slot, recognition, animate) {
  const videoStats = createVideoStats(recognition);
  slot.replaceChildren(videoStats);

  showFrameCount(videoStats, recognition.framesProcessed, animate);

  if (recognition.topAnimals?.length) {
    renderDetectedAnimals(videoStats, recognition.topAnimals, animate);
  }
}

function createVideoStats({ topAnimals = [] }) {
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
  `;

  if (topAnimals.length > 0) {
    const detected = document.createElement("div");
    detected.className = "animals-detected";
    detected.innerHTML = `
      <h3>Animals detected (${topAnimals.length})</h3>
      <div class="animals-grid" data-animals-grid></div>
    `;
    container.append(detected);
  }

  return container;
}

function showFrameCount(videoStats, targetFrames, animate) {
  const counter = videoStats.querySelector("[data-frames-count]");
  const progressBar = videoStats.querySelector("[data-frames-progress]");

  const paint = (frames, progress) => {
    counter.textContent = frames;
    progressBar.style.width = `${progress * 100}%`;
  };

  if (animate) {
    animateCount(targetFrames, paint);
  } else {
    paint(targetFrames > 0 ? targetFrames : 0, 1);
  }
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

function renderDetectedAnimals(videoStats, topAnimals, animate) {
  const grid = videoStats.querySelector("[data-animals-grid]");

  topAnimals.forEach((entry, index) => {
    const card = createAnimalCard(entry, index);
    grid.append(card);

    // Sent as text, such as "0.87".
    const targetScore = Math.round(parseFloat(entry.averageScore) * 100);

    if (!animate) {
      showScore(card, Number.isFinite(targetScore) ? targetScore : 0);
      return;
    }

    setTimeout(
      () => animateCount(targetScore, (score) => showScore(card, score)),
      SCORE_ANIMATION_DELAY_MS + index * SCORE_ANIMATION_STAGGER_MS,
    );
  });
}

function createAnimalCard({ animal }, index) {
  const card = document.createElement("div");
  card.className = "animal-card";
  card.style.animationDelay = `${index * 0.08}s`;

  const icon = document.createElement("div");
  icon.className = "animal-icon";
  icon.innerHTML = `
    <svg viewBox="0 0 24 24" class="animal-svg">
      <circle cx="12" cy="12" r="11"></circle>
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central"
            font-size="10px" font-weight="700"></text>
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

function showScore(card, score) {
  card.querySelector(".animal-score-fill").style.width = `${score}%`;
  card.querySelector(".animal-score-percentage").textContent = `${score}%`;
}
