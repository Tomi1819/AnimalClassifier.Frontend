document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "https://localhost:44378";
  const token = sessionStorage.getItem("token");

  if (!token) {
    console.warn("No token found. Redirecting to login...");
    window.location.href = "login.html";
    return;
  }

  const searchInput = document.getElementById("searchInput");
  const searchButton = document.getElementById("searchButton");
  const suggestionsContainer = document.getElementById("suggestionsContainer");
  const searchResults = document.getElementById("searchResults");
  const resultsTitle = document.getElementById("resultsTitle");
  const resultsCount = document.getElementById("resultsCount");
  const resultsGrid = document.getElementById("resultsGrid");
  const noResults = document.getElementById("noResults");
  const loadingIndicator = document.getElementById("loadingIndicator");

  const popularAnimals = [
    { name: "cat", icon: "🐱" },
    { name: "dog", icon: "🐶" },
    { name: "mouse", icon: "🐭" },
    { name: "horse", icon: "🐴" },
    { name: "cow", icon: "🐄" },
    { name: "pig", icon: "🐷" },
  ];

  const fallbackImage =
    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgdmlld0JveD0nMCAwIDEwMCAxMDAnIHhtbG5zPSdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Zyc+PHJlY3Qgd2lkdGg9JzEwMCUnIGhlaWdodD0nMTAwJScgc3R5bGU9J2ZpbGw6I2VlZTsnIC8+PHRleHQgeD0nNTAlJyB5PSc1MCUnIHN0eWxlPSdmaWxsOiM5OTk7Zm9udC1zaXplOjEycHg7dGV4dC1hbmNob3I6bWlkZGxlO2RvbWFpbi1iYXNlbGluZTpjZW50cmFsOycnPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";

  function buildImageUrl(path) {
    if (!path || typeof path !== "string") return fallbackImage;
    return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  }

  function createSuggestionButton(label, handler, extraClass = "") {
    const btn = document.createElement("button");
    btn.className = `suggestion-btn ${extraClass}`.trim();
    btn.textContent = label;
    btn.addEventListener("click", handler);
    return btn;
  }

  function initializeSuggestions() {
    suggestionsContainer.innerHTML = "";
    popularAnimals.forEach(({ name, icon }) => {
      suggestionsContainer.appendChild(
        createSuggestionButton(
          `${icon} ${name}`,
          () => {
            searchInput.value = name;
            performSearch(name);
          },
          "popular"
        )
      );
    });
  }

  async function performSearch(query) {
    if (!query.trim()) {
      showNoResults("No Results", "Try a different animal name.");
      return;
    }

    showLoading();

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/animal/search?searchTerm=${encodeURIComponent(
          query
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) throw new Error("Search request failed");

      const data = await res.json();
      Array.isArray(data) && data.length > 0
        ? displayResults(data, query)
        : showNoResults("No Results", "Try a different animal name.");
    } catch (err) {
      console.error("Search error:", err);
      showNoResults("Search Error", "Something went wrong. Please try again.");
    } finally {
      hideLoading();
    }
  }

  function displayResults(results, query) {
    hideAllSections();

    resultsTitle.textContent = `Results for "${query}"`;

    const totalImages = results.reduce((sum, a) => sum + (a.count || 0), 0);
    resultsCount.textContent = `${results.length} animal${
      results.length !== 1 ? "s" : ""
    } • ${totalImages} image${totalImages !== 1 ? "s" : ""}`;

    resultsGrid.innerHTML = "";
    results.forEach((animal) =>
      resultsGrid.appendChild(createAnimalCard(animal))
    );

    searchResults.style.display = "block";
  }

  function createAnimalCard({ animalName, count = 0, imagePaths = [] }) {
    const card = document.createElement("div");
    card.className = "animal-result-card";

    const header = document.createElement("div");
    header.className = "animal-card-header";

    const name = document.createElement("h3");
    name.className = "animal-name";
    name.textContent = animalName;

    const counter = document.createElement("span");
    counter.className = "animal-count";
    counter.textContent = `${count} image${count !== 1 ? "s" : ""}`;

    header.append(name, counter);

    const imagesGrid = document.createElement("div");
    imagesGrid.className = "images-grid";

    imagePaths.slice(0, 6).forEach((path) => {
      const img = document.createElement("img");
      img.className = "animal-image";
      img.src = buildImageUrl(path);
      img.alt = animalName;
      img.loading = "lazy";
      img.onerror = () => {
        img.src = fallbackImage;
        img.alt = "Image not available";
      };
      img.addEventListener("click", () => showImageModal(img.src, animalName));
      imagesGrid.appendChild(img);
    });

    card.append(header, imagesGrid);
    return card;
  }

  function showImageModal(src, alt) {
    document.querySelector(".image-modal")?.remove();

    const modal = document.createElement("div");
    modal.className = "image-modal";

    const closeBtn = document.createElement("span");
    closeBtn.className = "close-modal";
    closeBtn.innerHTML = "&times;";
    closeBtn.onclick = () => modal.classList.remove("active");

    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;

    modal.append(closeBtn, img);
    document.body.appendChild(modal);

    setTimeout(() => modal.classList.add("active"), 10);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });

    const escHandler = (e) => {
      if (e.key === "Escape") {
        modal.classList.remove("active");
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  }

  async function loadInitialData() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/animal/search?searchTerm=`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        updateSuggestions(data);
      } else {
        initializeSuggestions();
      }
    } catch {
      initializeSuggestions();
    }
  }

  function updateSuggestions(results) {
    suggestionsContainer.innerHTML = "";

    const uniqueNames = [...new Set(results.map((r) => r.animalName))].slice(
      0,
      5
    );
    uniqueNames.forEach((name) => {
      suggestionsContainer.appendChild(
        createSuggestionButton(name, () => {
          searchInput.value = name;
          performSearch(name);
        })
      );
    });

    const remaining = 8 - uniqueNames.length;
    popularAnimals
      .filter((a) => !uniqueNames.includes(a.name))
      .slice(0, remaining)
      .forEach(({ name, icon }) => {
        suggestionsContainer.appendChild(
          createSuggestionButton(
            `${icon} ${name}`,
            () => {
              searchInput.value = name;
              performSearch(name);
            },
            "popular"
          )
        );
      });
  }

  function showNoResults(title, message) {
    hideAllSections();
    noResults.querySelector("h2").textContent = title;
    noResults.querySelector("p").textContent = message;
    noResults.style.display = "block";
  }

  function showLoading() {
    hideAllSections();
    loadingIndicator.style.display = "block";
  }

  function hideLoading() {
    loadingIndicator.style.display = "none";
  }

  function hideAllSections() {
    searchResults.style.display = "none";
    noResults.style.display = "none";
    loadingIndicator.style.display = "none";
  }

  searchButton.addEventListener("click", () => {
    const query = searchInput.value.trim();
    if (query) performSearch(query);
  });

  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const query = searchInput.value.trim();
      if (query) performSearch(query);
    }
  });

  let debounceTimeout;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimeout);
    const query = e.target.value.trim();
    if (query.length >= 2) {
      debounceTimeout = setTimeout(() => performSearch(query), 500);
    } else if (!query) {
      hideAllSections();
    }
  });

  loadInitialData();
});
