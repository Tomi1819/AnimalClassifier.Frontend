import { FIND_STATUS, getCollectionFind } from "../api/recognitions.js";
import { describeFind } from "../collection/find-text.js";
import { createElement } from "../shared/dom.js";
import { COLLECTION_PAGE } from "../shared/pages.js";

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
 * @returns `show(recognition)`, which asks the backend afresh each time, as
 *   what the user says of a recognition changes what it finds, and `hide()`.
 */
export function initCollectionNote(slot) {
  // Only the last question asked may draw its answer, so one that arrives
  // after the user has moved on to another recognition is dropped.
  let latest = null;

  return {
    show: async (recognition) => {
      // The same recognition keeps its line until the new one arrives, rather
      // than blinking out while its feedback is sent.
      if (recognition.id !== latest?.recognitionId) {
        slot.replaceChildren();
      }

      const asked = { recognitionId: recognition.id };
      latest = asked;

      let find;
      try {
        find = await getCollectionFind(recognition.id);
      } catch (error) {
        // The result stands without it, so it is only logged.
        console.error("Could not load what the recognition found:", error);
        return;
      }

      if (latest === asked) {
        slot.replaceChildren(...createNote(find, recognition));
      }
    },
    hide: () => {
      latest = null;
      slot.replaceChildren();
    },
  };
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
