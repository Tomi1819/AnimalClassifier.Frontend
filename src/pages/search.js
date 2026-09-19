import { apiFetch, resolveUrl } from "../api/client.js";
import { requireAuthentication } from "../auth/session.js";
import { initNavigation } from "../shared/nav.js";

const NOT_FOUND_STATUS = 404;
const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;
// Two full rows at the widest gallery layout; "Show all" reveals the rest.
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

// Module scripts are deferred, so the document is already parsed here.
// The guard runs first, so an expired session never paints the signed-in nav.
if (requireAuthentication()) {
  initNavigation();

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
    searchInput: document.getElementById("searchInput"),
    searchButton: document.getElementById("searchButton"),
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
  const { searchInput, searchButton } = elements;

  searchButton.addEventListener("click", () => search(searchInput.value.trim()));

  searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      search(searchInput.value.trim());
    }
  });

  searchInput.addEventListener("input", (event) => {
    clearTimeout(debounceTimeout);

    const query = event.target.value.trim();
    if (query.length >= MIN_QUERY_LENGTH) {
      debounceTimeout = setTimeout(() => search(query), SEARCH_DEBOUNCE_MS);
    } else if (!query) {
      hideAllSections();
    }
  });
}

async function search(query) {
  if (!query) {
    return;
  }

  showLoading();

  try {
    const results = await apiFetch(`/api/animal/search?searchTerm=${encodeURIComponent(query)}`);
    displayResults(results, query);
  } catch (error) {
    console.error("Search failed:", error);

    // The backend answers 404 when nothing matches, which is not an error here.
    if (error.status === NOT_FOUND_STATUS) {
      showEmptyState("No animals found", "Try a different search term or check your spelling");
      return;
    }

    // Anything else reports itself, so an unreachable backend says so rather
    // than implying the search term was at fault.
    showEmptyState("Search Error", error.message);
  }
}

function displayResults(results, query) {
  const { resultsTitle, resultsCount, resultsList, searchResults } = elements;

  hideAllSections();

  resultsTitle.textContent = `Results for "${query}"`;
  resultsCount.textContent = describeResults(results);
  resultsList.replaceChildren(...results.map(createAnimalGallery));
  searchResults.style.display = "block";
}

function describeResults(results) {
  const totalImages = results.reduce((total, animal) => total + (animal.count ?? 0), 0);
  return `${pluralize(results.length, "animal")} • ${pluralize(totalImages, "image")}`;
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function createAnimalGallery({ animalName, count = 0, imagePaths = [] }) {
  const title = document.createElement("h3");
  title.className = "gallery__title";
  title.textContent = animalName;

  const counter = document.createElement("span");
  counter.className = "gallery__count";
  counter.textContent = pluralize(count, "image");

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
    const showAll = document.createElement("button");
    showAll.type = "button";
    showAll.className = "btn-ghost gallery__more";
    showAll.textContent = `Show all ${pluralize(imagePaths.length, "image")}`;
    showAll.addEventListener("click", () => {
      const [firstRevealed] = appendTiles(INITIAL_IMAGES_PER_ANIMAL);
      showAll.remove();
      // The focused button is gone, so keyboard users continue from the first new image.
      firstRevealed.querySelector("button").focus();
    });
    section.append(showAll);
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
  tile.addEventListener("click", () => openImageModal(image.src, animalName));

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

function openImageModal(source, alt) {
  document.querySelector(".image-modal")?.remove();

  const closeButton = document.createElement("span");
  closeButton.className = "close-modal";
  closeButton.innerHTML = "&times;";

  const image = document.createElement("img");
  image.src = source;
  image.alt = alt;

  const modal = document.createElement("div");
  modal.className = "image-modal";
  modal.append(closeButton, image);
  document.body.append(modal);

  const close = () => {
    modal.remove();
    document.removeEventListener("keydown", onKeyDown);
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      close();
    }
  };

  closeButton.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      close();
    }
  });
  document.addEventListener("keydown", onKeyDown);

  requestAnimationFrame(() => modal.classList.add("active"));
}

function renderSuggestions(animals) {
  elements.suggestionsContainer.replaceChildren(
    ...animals.slice(0, MAX_SUGGESTIONS).map(({ name, icon }) => {
      const button = document.createElement("button");
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
  noResults.style.display = "block";
}

function showLoading() {
  hideAllSections();
  elements.loadingIndicator.style.display = "block";
}

function hideAllSections() {
  elements.searchResults.style.display = "none";
  elements.noResults.style.display = "none";
  elements.loadingIndicator.style.display = "none";
}
