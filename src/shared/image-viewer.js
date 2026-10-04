import { svgIcon } from "./icons.js";

const CLOSE_LABEL = "Close";

// Built on first use and kept, so that the pages carry no markup for it and
// only one viewer is ever added to the document.
let elements = null;

/**
 * Shows an image as large as the window allows, over the page, until the user
 * closes it with its button, with Escape, or by clicking beside it.
 *
 * It is a modal dialog, so the keyboard stays inside it while it is open, and
 * the browser returns focus to whatever opened it once it closes.
 *
 * @param source the image's URL.
 * @param description what the image shows, for anyone who cannot see it.
 */
export function showImage(source, description) {
  const { dialog, image } = (elements ??= build());

  image.src = source;
  image.alt = description;
  dialog.showModal();
}

function build() {
  const dialog = document.createElement("dialog");
  dialog.className = "image-viewer";

  // A dialog form closes the dialog on submit, so the button needs no handler
  // of its own.
  dialog.innerHTML = `
    <form method="dialog">
      <button class="image-viewer__close">
        ${svgIcon("close", "image-viewer__close-icon")}
      </button>
    </form>
    <img class="image-viewer__image" alt="" />
  `;
  dialog.querySelector(".image-viewer__close").setAttribute("aria-label", CLOSE_LABEL);

  // A click on the backdrop lands on the dialog itself, where one on the
  // image or the button lands on them.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  document.body.append(dialog);

  return { dialog, image: dialog.querySelector(".image-viewer__image") };
}
