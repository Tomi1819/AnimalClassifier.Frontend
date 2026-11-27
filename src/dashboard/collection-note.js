import { FIND_STATUS, getCollectionFind } from "../api/recognitions.js";
import { describeFind } from "../collection/find-text.js";
import { createElement } from "../shared/dom.js";
import { COLLECTION_PAGE } from "../shared/pages.js";
import { initRecognitionNote } from "./recognition-note.js";

const VARIANTS = {
  [FIND_STATUS.FIRST_FIND]: "collection-note--first",
  [FIND_STATUS.ALREADY_FOUND]: "collection-note--found",
  [FIND_STATUS.UNCONFIRMED]: "collection-note--unconfirmed",
};

/**
 * The line under a recognition's result that says what it did for the user's
 * collection: a first find, an animal found already, or one the model was not
 * sure enough of, which the user can confirm.
 *
 * @param slot the element the line is drawn in.
 * @returns `show(recognition)` and `hide()`, as `initRecognitionNote` gives.
 */
export function initCollectionNote(slot) {
  return initRecognitionNote(slot, {
    subject: "what the recognition found",
    load: getCollectionFind,
    build: createNote,
  });
}

function createNote(find, recognition) {
  const text = describeFind(find, { canConfirm: recognition.type === "image" });
  if (!text) {
    return [];
  }

  const note = createElement("p", `collection-note ${VARIANTS[find.status]}`, text);

  if (find.status === FIND_STATUS.FIRST_FIND) {
    const link = createElement("a", "", "See your collection");
    link.href = COLLECTION_PAGE;
    note.append(" ", link);
  }

  return [note];
}
