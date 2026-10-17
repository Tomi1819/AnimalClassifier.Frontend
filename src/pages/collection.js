import { resolveUrl } from "../api/client.js";
import { getCollection } from "../api/recognitions.js";
import { COLLECTION_FILTER, filterAnimals, isFound } from "../collection/filter.js";
import { createElement } from "../shared/dom.js";
import { showError } from "../shared/feedback.js";
import { formatCalendarDate } from "../shared/format.js";
import { svgIcon } from "../shared/icons.js";
import { showImage } from "../shared/image-viewer.js";
import { initPage, PAGE_ACCESS } from "../shared/page.js";
import { DASHBOARD_PAGE, SEARCH_PAGE } from "../shared/pages.js";

const count = new Intl.NumberFormat();
const share = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });

if (initPage(PAGE_ACCESS.SIGNED_IN)) {
  await showCollection(collectPageElements());
}

function collectPageElements() {
  return {
    content: document.getElementById("collectionContent"),
    status: document.getElementById("collectionStatus"),
    figure: document.getElementById("collectionFigure"),
    fill: document.getElementById("collectionFill"),
    filters: [...document.querySelectorAll("[data-collection-filter]")],
    grid: document.getElementById("collectionGrid"),
    empty: document.getElementById("collectionEmpty"),
  };
}

async function showCollection(page) {
  let collection;

  try {
    collection = await getCollection();
  } catch (error) {
    console.error("Failed to load the collection:", error);
    page.content.hidden = true;
    showError(page.status, error.message);
    return;
  }

  renderProgress(page, collection);
  initFilters(page, collection.animals);
  page.content.removeAttribute("aria-busy");
}

function renderProgress(page, { foundCount, knownCount }) {
  // A model that knows no animal leaves nothing to find, rather than a share
  // that is not a number.
  const fraction = knownCount > 0 ? foundCount / knownCount : 0;

  page.figure.replaceChildren(
    createElement("strong", "", count.format(foundCount)),
    ` of ${count.format(knownCount)} · ${share.format(fraction)}`,
  );
  page.fill.style.width = `${fraction * 100}%`;
}

/* -------------------------------------------------------------------------
   Filter

   Every animal arrives at once, so a filter only redraws the cards from what
   the page holds, without asking the backend again.
   ------------------------------------------------------------------------- */

function initFilters(page, animals) {
  for (const button of page.filters) {
    const filter = button.dataset.collectionFilter;

    button.querySelector("[data-filter-count]").textContent = count.format(
      filterAnimals(animals, filter).length,
    );

    button.addEventListener("click", () => {
      for (const other of page.filters) {
        const isSelected = other === button;
        other.classList.toggle("is-active", isSelected);
        other.setAttribute("aria-pressed", String(isSelected));
      }

      renderAnimals(page, animals, filter);
    });
  }

  renderAnimals(page, animals, COLLECTION_FILTER.ALL);
}

function renderAnimals(page, animals, filter) {
  const shown = filterAnimals(animals, filter);

  page.grid.replaceChildren(...shown.map(createAnimalCard));
  page.grid.hidden = shown.length === 0;
  page.empty.replaceChildren(...describeEmpty(filter));
  page.empty.hidden = shown.length > 0;
}

function describeEmpty(filter) {
  switch (filter) {
    case COLLECTION_FILTER.FOUND: {
      const upload = createElement("a", "", "Upload an image");
      upload.href = DASHBOARD_PAGE;
      return ["You have not found any animal yet. ", upload, " and the animal in it joins your collection."];
    }
    case COLLECTION_FILTER.NOT_FOUND:
      return ["You have found every animal the model knows. Well done!"];
    default:
      return ["The model knows no animals to collect yet."];
  }
}

/* -------------------------------------------------------------------------
   Cards
   ------------------------------------------------------------------------- */

function createAnimalCard(animal) {
  const found = isFound(animal);

  const card = createElement("li", found ? "collection-card is-found" : "collection-card");
  card.append(createPhoto(animal, found), createCardBody(animal, found));
  return card;
}

// The image the model was surest of, which opens as large as the window
// allows. An animal without one shows whether it is found instead.
function createPhoto({ animalName, imagePath }, found) {
  if (!imagePath) {
    return createPhotoPlaceholder(found);
  }

  const image = createElement("img");
  image.src = resolveUrl(imagePath);
  // The button's label names the image, so the image itself stays silent.
  image.alt = "";
  image.loading = "lazy";

  const button = createElement("button", "collection-card__photo");
  button.type = "button";
  button.setAttribute("aria-label", `Open your best ${animalName} image`);
  button.append(image);
  button.addEventListener("click", () => showImage(image.src, animalName));

  // A link that has run out, or a file deleted since, leaves the card as one
  // without an image rather than a broken one.
  image.addEventListener("error", () => button.replaceWith(createPhotoPlaceholder(found)), {
    once: true,
  });

  return button;
}

function createPhotoPlaceholder(found) {
  const placeholder = createElement("div", "collection-card__photo collection-card__photo--empty");
  placeholder.innerHTML = svgIcon(found ? "found" : "locked", "collection-card__icon");
  return placeholder;
}

function createCardBody({ animalName, count: finds, dateFirstRecognized, imagePath }, found) {
  const name = createElement("h3", "collection-card__name");

  // The search shows the images still in the history, so only an animal with
  // one has anything there to see.
  if (imagePath) {
    const link = createElement("a", "", animalName);
    link.href = `${SEARCH_PAGE}?q=${encodeURIComponent(animalName)}`;
    link.title = `View ${animalName} images`;
    name.append(link);
  } else {
    name.textContent = animalName;
  }

  const body = createElement("div", "collection-card__body");
  body.append(name);

  if (found) {
    body.append(
      createElement("p", "collection-card__meta", describeFinds(finds)),
      createElement("p", "collection-card__meta", `First on ${formatCalendarDate(dateFirstRecognized)}`),
    );
  } else {
    body.append(createElement("p", "collection-card__meta", "Not found yet"));
  }

  return body;
}

function describeFinds(finds) {
  return finds === 1 ? "Found once" : `Found ${count.format(finds)} times`;
}
