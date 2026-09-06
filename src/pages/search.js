import { apiFetch, resolveUrl } from "../api/client.js";
import { requireAuthentication } from "../auth/session.js";
import { initNavigation } from "../shared/nav.js";

const SEARCH_DEBOUNCE_MS = 500;
const MIN_QUERY_LENGTH = 2;
const MAX_IMAGES_PER_CARD = 6;
const MAX_SUGGESTIONS = 8;

const POPULAR_ANIMALS = [
  { name: "cat", icon: "🐱" },
  { name: "dog", icon: "🐶" },
  { name: "mouse", icon: "🐭" },
  { name: "horse", icon: "🐴" },
  { name: "cow", icon: "🐄" },
  { name: "pig", icon: "🐷" },
];

const FALLBACK_IMAGE =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgdmlld0JveD0nMCAwIDEwMCAxMDAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHJlY3Qgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgc3R5bGU9J2ZpbGw6I2VlZTsnIC8+PHRleHQgeD0nNTAlJyB5PSc1MCUnIHN0eWxlPSdmaWxsOiM5OTk7Zm9udC1zaXplOjEycHg7dGV4dC1hbmNob3I6bWlkZGxlO2RvbWFpbi1iYXNlbGluZTpjZW50cmFsOycnPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";

let elements;
let debounceTimeout;

initNavigation();

// Module scripts are deferred, so the document is already parsed here.
if (requireAuthentication()) {
  elements = collectElements();
  initSearchControls();
  renderSuggestions(POPULAR_ANIMALS);
}

function collectElements() {
  return {
    searchInput: document.getElementById("searchInput"),
    searchButton: document.getElementById("searchButton"),
    suggestionsContainer: document.getElementById("suggestionsContainer"),
    searchResults: document.getElementById("searchResults"),
    resultsTitle: document.getElementById("resultsTitle"),
    resultsCount: document.getElementById("resultsCount"),
    resultsGrid: document.getElementById("resultsGrid"),
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
    showEmptyState(
      error.status === 404 ? "No animals found" : "Search Error",
      error.status === 404
        ? "Try a different search term or check your spelling"
        : "Something went wrong. Please try again.",
    );
  }
}

function displayResults(results, query) {
  const { resultsTitle, resultsCount, resultsGrid, searchResults } = elements;

  hideAllSections();

  resultsTitle.textContent = `Results for "${query}"`;
  resultsCount.textContent = describeResults(results);
  resultsGrid.replaceChildren(...results.map(createAnimalCard));
  searchResults.style.display = "block";
}

function describeResults(results) {
  const totalImages = results.reduce((total, animal) => total + (animal.count ?? 0), 0);
  return `${pluralize(results.length, "animal")} • ${pluralize(totalImages, "image")}`;
}

function pluralize(count, noun) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function createAnimalCard({ animalName, count = 0, imagePaths = [] }) {
  const name = document.createElement("h3");
  name.className = "animal-name";
  name.textContent = animalName;

  const counter = document.createElement("span");
  counter.className = "animal-count";
  counter.textContent = pluralize(count, "image");

  const header = document.createElement("div");
  header.className = "animal-card-header";
  header.append(name, counter);

  const imagesGrid = document.createElement("div");
  imagesGrid.className = "images-grid";
  imagesGrid.append(
    ...imagePaths
      .slice(0, MAX_IMAGES_PER_CARD)
      .map((path) => createAnimalImage(path, animalName)),
  );

  const card = document.createElement("div");
  card.className = "animal-result-card";
  card.append(header, imagesGrid);
  return card;
}

function createAnimalImage(path, animalName) {
  const image = document.createElement("img");
  image.className = "animal-image";
  image.src = buildImageUrl(path);
  image.alt = animalName;
  image.loading = "lazy";

  image.addEventListener("error", () => {
    image.src = FALLBACK_IMAGE;
    image.alt = "Image not available";
  });
  image.addEventListener("click", () => openImageModal(image.src, animalName));

  return image;
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
