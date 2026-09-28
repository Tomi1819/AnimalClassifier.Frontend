import { apiFetch } from "../api/client.js";
import { clearSession, setSession } from "./session.js";

const ACCOUNT_PATH = "/api/account";
const CHANGE_PASSWORD_PATH = "/api/account/change-password";
const SIGN_OUT_OTHER_SESSIONS_PATH = "/api/account/sign-out-other-sessions";

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
