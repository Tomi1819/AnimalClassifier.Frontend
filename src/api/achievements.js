import { apiFetch } from "./client.js";

const ACHIEVEMENTS_PATH = "/api/achievements";

/**
 * The signed-in user's level, and every badge with how far they are towards
 * it. Both are worked out from their recognitions as the collection counts
 * them, so saying whether the model was right, or deleting a recognition, can
 * change them.
 *
 * @param timeZone the IANA time zone the days in a row are counted in.
 * @returns `{ foundCount, knownCount, level, nextLevel, levels, badges }`,
 *   where each level is `{ number, name, animalsNeeded, isReached,
 *   dateReached }`, `nextLevel` is null at the last, and each of the badges,
 *   in the order they are shown, is `{ id, name, description, goal, progress,
 *   isEarned, dateEarned }`. The names and descriptions are written to be
 *   shown as they stand.
 * @throws {ApiError} with status 400 when the backend knows no such time zone.
 */
export function getAchievements(timeZone) {
  return apiFetch(`${ACHIEVEMENTS_PATH}?${new URLSearchParams({ timeZone })}`);
}

/**
 * What one of the signed-in user's recognitions earned them, as it stands
 * now: what they have with it that they would not have without it.
 *
 * @param timeZone as for `getAchievements`.
 * @returns `{ newLevel, newBadges }`, where `newLevel` is a level as
 *   `getAchievements` gives it, or null when it took them up none, and
 *   `newBadges` the badges it earned, which are none when it earned none.
 * @throws {ApiError} with status 404 when the recognition is not theirs.
 */
export function getRecognitionAchievements(recognitionId, timeZone) {
  return apiFetch(
    `${ACHIEVEMENTS_PATH}/recognitions/${encodeURIComponent(recognitionId)}?${new URLSearchParams({ timeZone })}`,
  );
}
