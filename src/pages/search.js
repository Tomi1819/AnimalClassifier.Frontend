import { resolveUrl } from "../api/client.js";
import { searchAnimals } from "../api/recognitions.js";
import { pluralize } from "../shared/format.js";
import { showImage } from "../shared/image-viewer.js";
import { initPage, PAGE_ACCESS } from "../shared/page.js";

const NOT_FOUND_STATUS = 404;
const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;
// Two full rows at the widest gallery layout; "Show more" reveals the rest.
const INITIAL_IMAGES_PER_ANIMAL = 8;
const MAX_SUGGESTIONS = 8;
// Lets other pages link straight to an animal's images, as the statistics page does.
const QUERY_PARAM = "q";

const POPULAR_ANIMALS = [
  { name: "cat", icon: "🐱" },
  { name: "dog", icon: "🐶" },
  { name: "mouse", icon: "🐭" },
  { name: "horse", icon: "🐴" },
  { name: "cow", icon: "🐄" },
  { name: "pig", icon: "🐷" },
];

const FALLBACK_IMAGE = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'>" +
    "<rect width='100' height='100' fill='#eee'/>" +
    "<text x='50' y='50' fill='#999' font-family='sans-serif' font-size='12' text-anchor='middle' dominant-baseline='central'>No Image</text>" +
    "</svg>",
)}`;

let elements;
let debounceTimeout;
// The search waiting for its answer, so that a newer one can call it off.
let pendingSearch = null;

if (initPage(PAGE_ACCESS.SIGNED_IN)) {
  elements = collectElements();
  initSearchControls();
  renderSuggestions(POPULAR_ANIMALS);
  searchFromAddress();
}

function searchFromAddress() {
  const query = new URLSearchParams(window.location.search).get(QUERY_PARAM)?.trim();
  if (query) {
    elements.searchInput.value = query;
    search(query);
  }
}

function collectElements() {
  return {
    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("searchInput"),
    suggestionsContainer: document.getElementById("suggestionsContainer"),
    searchResults: document.getElementById("searchResults"),
    resultsTitle: document.getElementById("resultsTitle"),
    resultsCount: document.getElementById("resultsCount"),
    resultsList: document.getElementById("resultsList"),
    noResults: document.getElementById("noResults"),
    loadingIndicator: document.getElementById("loadingIndicator"),
  };
}

function initSearchControls() {
  const { searchForm, searchInput } = elements;

  // The button and Enter in the field both submit the form.
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    search(searchInput.value.trim());
  });

  searchInput.addEventListener("input", (event) => {
    clearTimeout(debounceTimeout);

    const query = event.target.value.trim();
    if (query.length >= MIN_QUERY_LENGTH) {
      debounceTimeout = setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
    } else if (!query) {
      cancelSearch();
      hideAllSections();
    }
  });
}

async function search(query) {
  // However it was started, a search replaces the one waiting to start and the
  // one waiting for its answer, which could otherwise arrive later and be
  // shown in place of this one's.
  cancelSearch();

  if (!query) {
    return;
  }

  const { signal } = (pendingSearch = new AbortController());
  showLoading();

  try {
    const results = await searchAnimals(query, signal);
    if (!signal.aborted) {
      displayResults(results, query);
    }
  } catch (error) {
    // Replaced by a newer search, which shows its own answer.
    if (signal.aborted) {
      return;
    }

    // The backend answers 404 when nothing matches, which is not an error here.
    if (error.status === NOT_FOUND_STATUS) {
      showEmptyState("No animals found", "Try a different search term or check your spelling");
      return;
    }

    console.error("Search failed:", error);

    // Anything else reports itself, so an unreachable backend says so rather
    // than implying the search term was at fault.
    showEmptyState("Search Error", error.message);
  }
}

function cancelSearch() {
  clearTimeout(debounceTimeout);
  pendingSearch?.abort();
}

function displayResults(results, query) {
  const { resultsTitle, resultsCount, resultsList, searchResults } = elements;

  hideAllSections();

  resultsTitle.textContent = `Results for "${query}"`;
  resultsCount.textContent = describeResults(results);
  resultsList.replaceChildren(...results.map(createAnimalGallery));
  searchResults.hidden = false;
}

function describeResults(results) {
  const totalImages = results.reduce((total, animal) => total + (animal.count ?? 0), 0);
  return `${pluralize(results.length, "animal")} • ${pluralize(totalImages, "image")}`;
}

function createAnimalGallery({ animalName, count = 0, imagePaths = [] }) {
  const title = document.createElement("h3");
  title.className = "gallery__title";
  title.textContent = animalName;

  const counter = document.createElement("span");
  counter.className = "gallery__count";
  // The search links to only the most recent images, but counts every one.
  counter.textContent =
    count > imagePaths.length
      ? `${pluralize(count, "image")} · latest ${imagePaths.length} shown`
      : pluralize(count, "image");

  const head = document.createElement("div");
  head.className = "gallery__head";
  head.append(title, counter);

  const grid = document.createElement("ul");
  grid.className = "gallery__grid";

  const section = document.createElement("section");
  section.className = "gallery";
  section.append(head, grid);

  // Tiles are built only when shown, so hidden images never start downloading.
  const appendTiles = (start, end) => {
    const tiles = imagePaths
      .slice(start, end)
      .map((path, offset) => createImageTile(path, animalName, start + offset, imagePaths.length));
    grid.append(...tiles);
    return tiles;
  };

  appendTiles(0, INITIAL_IMAGES_PER_ANIMAL);

  if (imagePaths.length > INITIAL_IMAGES_PER_ANIMAL) {
    const showMore = document.createElement("button");
    showMore.type = "button";
    showMore.className = "btn-ghost gallery__more";
    showMore.textContent = `Show ${imagePaths.length - INITIAL_IMAGES_PER_ANIMAL} more`;
    showMore.addEventListener("click", () => {
      const [firstRevealed] = appendTiles(INITIAL_IMAGES_PER_ANIMAL);
      showMore.remove();
      // The focused button is gone, so keyboard users continue from the first new image.
      firstRevealed.querySelector("button").focus();
    });
    section.append(showMore);
  }

  return section;
}

function createImageTile(path, animalName, position, total) {
  const image = document.createElement("img");
  image.src = buildImageUrl(path);
  // The tile's label names the image, so the image itself stays silent.
  image.alt = "";
  image.loading = "lazy";
  // Once only, so a fallback that also failed could not retrigger it forever.
  image.addEventListener(
    "error",
    () => {
      image.src = FALLBACK_IMAGE;
    },
    { once: true },
  );

  const tile = document.createElement("button");
  tile.type = "button";
  tile.className = "gallery__tile";
  tile.setAttribute("aria-label", `Open ${animalName} image ${position + 1} of ${total}`);
  tile.append(image);
  tile.addEventListener("click", () => showImage(image.src, animalName));

  const item = document.createElement("li");
  item.append(tile);
  return item;
}

function buildImageUrl(path) {
  if (typeof path !== "string" || !path) {
    return FALLBACK_IMAGE;
  }

  return path.startsWith("http") ? path : resolveUrl(path);
}

function renderSuggestions(animals) {
  elements.suggestionsContainer.replaceChildren(
    ...animals.slice(0, MAX_SUGGESTIONS).map(({ name, icon }) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "suggestion-btn popular";
      button.textContent = `${icon} ${name}`;
      button.addEventListener("click", () => {
        elements.searchInput.value = name;
        search(name);
      });
      return button;
    }),
  );
}

function showEmptyState(title, message) {
  const { noResults } = elements;

  hideAllSections();
  noResults.querySelector("h2").textContent = title;
  noResults.querySelector("p").textContent = message;
  noResults.hidden = false;
}

function showLoading() {
  hideAllSections();
  elements.loadingIndicator.hidden = false;
}

function hideAllSections() {
  elements.searchResults.hidden = true;
  elements.noResults.hidden = true;
  elements.loadingIndicator.hidden = true;
}
