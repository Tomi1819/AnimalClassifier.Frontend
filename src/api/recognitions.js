import { apiFetch } from "./client.js";

const IMAGE_UPLOAD_PATH = "/api/upload/image";
const VIDEO_UPLOAD_PATH = "/api/upload/video";
const HISTORY_PATH = "/api/upload/history";
const SEARCH_PATH = "/api/animal/search";
const STATISTICS_PATH = "/api/statistics";
const COLLECTION_PATH = "/api/collection";

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
 * @returns `{ videoId, framesProcessed, topAnimals, videoPath }`, where each
 *   of the `topAnimals` is `{ animal, averageScore }`, strongest first, and
 *   the score is written as text, such as "0.87".
 */
export function uploadVideo(file) {
  return upload(VIDEO_UPLOAD_PATH, VIDEO_FIELD, file);
}

/**
 * One page of the signed-in user's recognitions, most recent first.
 *
 * @param page counted from 1.
 * @returns `{ items, page, pageSize, totalCount }`, where each of the items is
 *   `{ id, mediaPath, recognizedAnimal, dateRecognized, predictionScore,
 *   framesProcessed, isVideo, feedback }`.
 */
export function getHistory(page) {
  return apiFetch(`${HISTORY_PATH}?${new URLSearchParams({ page })}`);
}

/**
 * Clears the signed-in user's history, which takes its images out of the
 * search as well. The recognitions are kept, so the statistics page still
 * counts them.
 */
export function clearHistory() {
  return apiFetch(HISTORY_PATH, { method: "DELETE" });
}

/**
 * Finds the animals whose name contains the term, among the signed-in user's
 * own images. No other user's images are ever found.
 *
 * @param signal calls the search off, such as one a newer search replaces.
 * @returns a list of `{ animalName, count, accuracy, imagePaths }`, where
 *   `count` is how many of the user's images the animal was recognised in, and
 *   `imagePaths` links to only the most recent of them, at most 12.
 * @throws {ApiError} with status 404 when no animal matches.
 */
export function searchAnimals(term, signal) {
  return apiFetch(`${SEARCH_PATH}?${new URLSearchParams({ searchTerm: term })}`, { signal });
}

/**
 * @returns how many recognitions the signed-in user has made, as a number.
 */
export function getTotalRecognitions() {
  return apiFetch(`${STATISTICS_PATH}/total`);
}

/**
 * @returns the animals the signed-in user recognised most, as a list of
 *   `{ animalName, count }`, most first. Only the leaders are listed.
 */
export function getMostCommonAnimals() {
  return apiFetch(`${STATISTICS_PATH}/top-animal`);
}

/**
 * How many recognitions the signed-in user made on each of the last days.
 *
 * @param timeZone the IANA time zone the days start and end in.
 * @returns a list of `{ date, count }`, oldest first and ending today, where
 *   `date` is a day such as "2026-10-03".
 */
export function getActivity(days, timeZone) {
  return apiFetch(`${STATISTICS_PATH}/activity?${new URLSearchParams({ days, timeZone })}`);
}

/**
 * What one recognition did for the signed-in user's collection, as the
 * backend names it.
 */
export const FIND_STATUS = Object.freeze({
  // The first of their recognitions to find its animal.
  FIRST_FIND: "FirstFind",
  // Another of their recognitions found the animal already.
  ALREADY_FOUND: "AlreadyFound",
  // The model was not sure enough of the animal, which saying it was right
  // finds.
  UNCONFIRMED: "Unconfirmed",
  // It finds no animal the model knows.
  NONE: "None",
});

/**
 * Every animal the model knows, and which of them the signed-in user has
 * found. A recognition, of an image or a video, finds an animal when the
 * model was sure enough of it or the user says it shows that animal, and an
 * animal stays found when the history is cleared.
 *
 * @returns `{ knownCount, foundCount, animals }`, where each of the animals,
 *   in alphabetical order, is `{ animalName, count, dateFirstRecognized,
 *   imagePath }`. One not found yet has a `count` of 0 and no date, and
 *   `imagePath` links to the image that shows it best, or is null when the
 *   history holds none, as for one found only in videos.
 */
export function getCollection() {
  return apiFetch(COLLECTION_PATH);
}

/**
 * What one of the signed-in user's recognitions did for their collection, as
 * it stands now: saying whether the model was right changes it.
 *
 * @returns `{ status, animalName, foundCount, knownCount }`, where `status` is
 *   one of FIND_STATUS, and `animalName` the animal it finds, or would once
 *   confirmed, which is null for FIND_STATUS.NONE.
 */
export function getCollectionFind(recognitionId) {
  return apiFetch(`${COLLECTION_PATH}/recognitions/${encodeURIComponent(recognitionId)}`);
}

function upload(path, field, file) {
  const body = new FormData();
  body.append(field, file);

  return apiFetch(path, { method: "POST", body });
}
