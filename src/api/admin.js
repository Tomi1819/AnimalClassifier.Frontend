import { apiDownload, apiFetch } from "./client.js";

const USERS_PATH = "/api/admin/users";
const AUDIT_PATH = "/api/admin/audit";
const FEEDBACK_PATH = "/api/admin/feedback";

/**
 * One page of the users whose name or email contains the search term, newest
 * first.
 *
 * @param search the term, which an empty one leaves every user matching.
 * @param page counted from 1.
 * @returns `{ items, page, pageSize, totalCount }`, where each of the items is
 *   `{ id, fullName, email, dateRegistered, isAdmin, isLocked, recognitionCount }`.
 */
export function getUsers(search, page) {
  return apiFetch(`${USERS_PATH}?${new URLSearchParams({ search, page })}`);
}

/**
 * One user's recognitions, as their own history lists them.
 */
export function getUserHistory(userId) {
  return apiFetch(`${userPath(userId)}/history`);
}

// Each of the changes below ends the user's sessions, is recorded in the audit
// log, and is refused for the administrator's own account.

export function lockUser(userId) {
  return changeUser(userId, "lock");
}

export function unlockUser(userId) {
  return changeUser(userId, "unlock");
}

export function grantAdmin(userId) {
  return changeUser(userId, "grant-admin");
}

export function revokeAdmin(userId) {
  return changeUser(userId, "revoke-admin");
}

/**
 * One page of the audit log, most recent first.
 *
 * @param page counted from 1.
 * @returns `{ items, page, pageSize, totalCount }`, where each of the items is
 *   `{ action, datePerformed, adminEmail, userEmail }`.
 */
export function getAuditLog(page) {
  return apiFetch(`${AUDIT_PATH}?${new URLSearchParams({ page })}`);
}

/**
 * What the feedback says of the model, counting all of it.
 *
 * @returns `{ totalCount, correctCount, wrongAnimalCount, unlistedAnimalCount,
 *   pendingCount, acceptedCount, rejectedCount, commonMistakes,
 *   requestedAnimals }`, where the review's counts are of the feedback that
 *   allows training, each of the `commonMistakes` is `{ recognizedAnimal,
 *   actualAnimal, count }` and each of the `requestedAnimals` is
 *   `{ animal, count }`, most first.
 */
export function getFeedbackSummary() {
  return apiFetch(`${FEEDBACK_PATH}/summary`);
}

/**
 * One page of the feedback offered for training in one state of review, in
 * the order it was given.
 *
 * @param status one of REVIEW_STATUS in api/feedback.js.
 * @param page counted from 1.
 * @returns `{ items, page, pageSize, totalCount }`, where each of the items is
 *   `{ id, imagePath, recognizedAnimal, predictionScore, verdict, label,
 *   isKnownAnimal, comment, reviewStatus, dateSubmitted, dateReviewed }`, and
 *   `label` is the animal the image would be trained as.
 */
export function getFeedbackForReview(status, page) {
  return apiFetch(`${FEEDBACK_PATH}?${new URLSearchParams({ status, page })}`);
}

export function acceptFeedback(feedbackId) {
  return reviewFeedback(feedbackId, "accept");
}

export function rejectFeedback(feedbackId) {
  return reviewFeedback(feedbackId, "reject");
}

/**
 * The accepted images, in a folder per animal, to retrain the model on.
 *
 * @returns the ZIP archive the backend builds, as a Blob.
 */
export function exportTrainingData() {
  return apiDownload(`${FEEDBACK_PATH}/export`);
}

function reviewFeedback(feedbackId, decision) {
  return apiFetch(`${FEEDBACK_PATH}/${encodeURIComponent(feedbackId)}/${decision}`, { method: "POST" });
}

function changeUser(userId, change) {
  return apiFetch(`${userPath(userId)}/${change}`, { method: "POST" });
}

function userPath(userId) {
  return `${USERS_PATH}/${encodeURIComponent(userId)}`;
}
