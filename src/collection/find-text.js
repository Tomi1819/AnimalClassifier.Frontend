import { FIND_STATUS } from "../api/recognitions.js";
import { formatCount } from "../shared/format.js";

/**
 * What one recognition did for the user's collection, in a sentence, such as
 * "Your first badger! That makes 24 of 90 in your collection."
 *
 * @param find as `getCollectionFind` gives it.
 * @param canConfirm whether the user can say the model was right, which only
 *   an image's recognition takes.
 * @returns the sentence, or null when there is nothing to say, as for a
 *   recognition that finds no animal the model knows.
 */
export function describeFind({ status, animalName, foundCount, knownCount }, { canConfirm }) {
  switch (status) {
    case FIND_STATUS.FIRST_FIND:
      return `Your first ${animalName}! That makes ${formatCount(foundCount)} of ${formatCount(knownCount)} in your collection.`;
    case FIND_STATUS.ALREADY_FOUND:
      return `Already in your collection: ${animalName}.`;
    case FIND_STATUS.UNCONFIRMED: {
      const unsure = `The model is not sure enough to add this ${animalName} to your collection.`;
      return canConfirm ? `${unsure} If it is right, say so below and it joins.` : unsure;
    }
    default:
      return null;
  }
}
