import { apiFetch } from "./client.js";

const IMAGE_UPLOAD_PATH = "/api/upload/image";
const VIDEO_UPLOAD_PATH = "/api/upload/video";
const HISTORY_PATH = "/api/upload/history";
const SEARCH_PATH = "/api/animal/search";
const STATISTICS_PATH = "/api/statistics";

// The form fields the backend reads each upload from.
const IMAGE_FIELD = "formFile";
const VIDEO_FIELD = "videoFile";

const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * The largest file the backend accepts, image or video. It is the backend's
 * UploadValidator.MaxFileSize, and the two have to match, as do the hints the
 * dashboard's dropzones give.
 */
export const MAX_UPLOAD_MEGABYTES = 5;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MEGABYTES * BYTES_PER_MEGABYTE;

/**
 * Recognises the animal in an image, and adds it to the signed-in user's
 * history.
 *
 * @returns `{ imageId, imagePath, recognizedAnimal, dateRecognized, predictionScore }`.
 */
export function uploadImage(file) {
  return upload(IMAGE_UPLOAD_PATH, IMAGE_FIELD, file);
}

/**
 * Recognises the animals in a video, a frame at a time, and adds it to the
 * signed-in user's history.
 *
 * @returns `{ framesProcessed, topAnimals, videoPath }`, where each of the
 *   `topAnimals` is `{ animal, averageScore }`, strongest first, and the score
 *   is written as text, such as "0.87".
 */
export function uploadVideo(file) {
  return upload(VIDEO_UPLOAD_PATH, VIDEO_FIELD, file);
}

/**
 * The signed-in user's recognitions, most recent first.
 *
 * @returns a list of `{ id, mediaPath, recognizedAnimal, dateRecognized,
 *   predictionScore, framesProcessed, isVideo }`.
 */
export function getHistory() {
  return apiFetch(HISTORY_PATH);
}

/**
 * Clears the signed-in user's history. The recognitions are kept, so the
 * search and statistics pages still count them.
 */
export function clearHistory() {
  return apiFetch(HISTORY_PATH, { method: "DELETE" });
}

/**
 * Finds the animals whose name contains the term, among the images every user
 * has had recognised.
 *
 * @param signal calls the search off, such as one a newer search replaces.
 * @returns a list of `{ animalName, count, accuracy, imagePaths }`.
 * @throws {ApiError} with status 404 when no animal matches.
 */
export function searchAnimals(term, signal) {
  return apiFetch(`${SEARCH_PATH}?${new URLSearchParams({ searchTerm: term })}`, { signal });
}

/**
 * @returns how many recognitions every user has made, as a number.
 */
export function getTotalRecognitions() {
  return apiFetch(`${STATISTICS_PATH}/total`);
}

/**
 * @returns how many users have made a recognition, as a number.
 */
export function getUserCount() {
  return apiFetch(`${STATISTICS_PATH}/users`);
}

/**
 * @returns the animals recognised most, as a list of `{ animalName, count }`,
 *   most first. Only the leaders are listed.
 */
export function getMostCommonAnimals() {
  return apiFetch(`${STATISTICS_PATH}/top-animal`);
}

/**
 * How many recognitions were made on each of the last days.
 *
 * @param timeZone the IANA time zone the days start and end in.
 * @returns a list of `{ date, count }`, oldest first and ending today, where
 *   `date` is a day such as "2026-10-03".
 */
export function getActivity(days, timeZone) {
  return apiFetch(`${STATISTICS_PATH}/activity?${new URLSearchParams({ days, timeZone })}`);
}

function upload(path, field, file) {
  const body = new FormData();
  body.append(field, file);

  return apiFetch(path, { method: "POST", body });
}
