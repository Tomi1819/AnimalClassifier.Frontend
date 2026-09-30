import { apiDownload, apiFetch } from "../api/client.js";
import { clearSession, setSession } from "./session.js";

const ACCOUNT_PATH = "/api/account";
const CHANGE_NAME_PATH = "/api/account/name";
const CHANGE_PASSWORD_PATH = "/api/account/change-password";
const SIGN_OUT_OTHER_SESSIONS_PATH = "/api/account/sign-out-other-sessions";
const EXPORT_DATA_PATH = "/api/account/export";

/**
 * The signed-in user's name, email and registration date. The token carries
 * only the email, so the name has to be asked for.
 *
 * @returns `{ fullName, email, dateRegistered }`.
 */
export function getProfile() {
  return apiFetch(ACCOUNT_PATH);
}

/**
 * Changes the name the signed-in user goes by. The backend keeps it as typed
 * apart from its spacing.
 *
 * @returns the profile with the name as the backend stored it.
 */
export function changeName(fullName) {
  return apiFetch(CHANGE_NAME_PATH, {
    method: "PUT",
    body: JSON.stringify({ fullName }),
  });
}

/**
 * Changes the signed-in user's password.
 */
export function changePassword(currentPassword, newPassword) {
  return continueSession(CHANGE_PASSWORD_PATH, { currentPassword, newPassword });
}

/**
 * Signs the account out everywhere except here.
 */
export function signOutOtherSessions() {
  return continueSession(SIGN_OUT_OTHER_SESSIONS_PATH);
}

/**
 * A copy of everything the signed-in user's account holds: their profile,
 * their whole history and the files they uploaded.
 *
 * @returns the ZIP archive the backend builds, as a Blob.
 */
export function exportData() {
  return apiDownload(EXPORT_DATA_PATH);
}

/**
 * Deletes the signed-in user's account once its password is confirmed. Every
 * session ends with it, so this one is forgotten as well.
 */
export async function deleteAccount(password) {
  await apiFetch(ACCOUNT_PATH, {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });

  clearSession();
}

/**
 * Makes a change that ends every session the account had, this one included.
 * The backend answers with a token to carry on with, and keeping it is what
 * stops the next request from signing the user out.
 */
async function continueSession(path, body) {
  const { token, roles } = await apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  });

  setSession(token, roles);
}
