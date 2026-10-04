import { REVIEW_STATUS, VERDICT } from "../api/feedback.js";

const TRAINING_STATES = {
  [REVIEW_STATUS.PENDING]: "Waiting for review",
  [REVIEW_STATUS.ACCEPTED]: "Accepted for training",
  [REVIEW_STATUS.REJECTED]: "Not accepted for training",
};

const NOT_FOR_TRAINING = "Not used for training";

/**
 * What a user said of a recognition, in a few words, such as "Correct" or
 * "Corrected to coyote".
 */
export function describeVerdict({ verdict, actualAnimal }) {
  switch (verdict) {
    case VERDICT.CORRECT:
      return "Correct";
    case VERDICT.WRONG_ANIMAL:
      return `Corrected to ${actualAnimal}`;
    case VERDICT.UNLISTED_ANIMAL:
      return `Not in the list: ${actualAnimal}`;
    default:
      return verdict;
  }
}

/**
 * Whether the model will learn from a feedback, such as "Waiting for review".
 * Only feedback that allows training is reviewed.
 */
export function describeTraining({ allowsTraining, reviewStatus }) {
  return allowsTraining ? (TRAINING_STATES[reviewStatus] ?? reviewStatus) : NOT_FOR_TRAINING;
}

/**
 * The animal the model knows by a name typed in any case and spacing, written
 * as the model writes it.
 *
 * @returns the animal, or null when the model does not know it.
 */
export function findKnownAnimal(knownAnimals, typed) {
  const wanted = typed.trim().replace(/\s+/g, " ").toLowerCase();

  return knownAnimals.find((animal) => animal.toLowerCase() === wanted) ?? null;
}
