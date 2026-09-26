import { apiFetch } from "../api/client.js";
import { setSession } from "./session.js";

const CHANGE_PASSWORD_PATH = "/api/account/change-password";

/**
 * Changes the signed-in user's password.
 */
export function changePassword(currentPassword, newPassword) {
  return continueSession(CHANGE_PASSWORD_PATH, { currentPassword, newPassword });
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
