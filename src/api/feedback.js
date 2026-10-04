import { apiFetch } from "./client.js";

const FEEDBACK_PATH = "/api/feedback";

/**
 * What a user can say of the animal the model named, as the backend names it.
 */
export const VERDICT = Object.freeze({
  CORRECT: "Correct",
  // Another animal the model knows, one of `getKnownAnimals`.
  WRONG_ANIMAL: "WrongAnimal",
  // An animal the model does not know, named in the user's own words.
  UNLISTED_ANIMAL: "UnlistedAnimal",
});

/**
 * Where an administrator's review of a feedback that allows training stands.
 */
export const REVIEW_STATUS = Object.freeze({
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
});

/**
 * Feedback is said of these, at most so long; the backend refuses longer.
 */
export const MAX_ANIMAL_LENGTH = 50;
export const MAX_COMMENT_LENGTH = 500;

/**
 * The animals the model knows, alphabetically, which a correction names one
 * of.
 */
export function getKnownAnimals() {
  return apiFetch(`${FEEDBACK_PATH}/animals`);
}

/**
 * One page of the feedback the signed-in user has given, most recently given
 * first.
 *
 * @param page counted from 1.
 * @returns `{ items, page, pageSize, totalCount }`, where each of the items is
 *   `{ recognitionId, imagePath, recognizedAnimal, predictionScore,
 *   dateRecognized, feedback }`.
 */
export function getFeedback(page) {
  return apiFetch(`${FEEDBACK_PATH}?${new URLSearchParams({ page })}`);
}

/**
 * Says whether the model named the right animal in one of the user's images,
 * in place of anything said of it before.
 *
 * @param feedback `{ verdict, actualAnimal, comment, allowsTraining }`, where
 *   `actualAnimal` is named only when the model was wrong.
 * @returns the feedback as the backend kept it: `{ verdict, actualAnimal,
 *   comment, allowsTraining, reviewStatus, dateSubmitted }`.
 */
export function giveFeedback(recognitionId, feedback) {
  return apiFetch(recognitionPath(recognitionId), {
    method: "PUT",
    body: JSON.stringify(feedback),
  });
}

export function withdrawFeedback(recognitionId) {
  return apiFetch(recognitionPath(recognitionId), { method: "DELETE" });
}

function recognitionPath(recognitionId) {
  return `${FEEDBACK_PATH}/${encodeURIComponent(recognitionId)}`;
}
