import { apiFetch } from "../api/client.js";
import { setSession } from "./session.js";

const CHANGE_PASSWORD_PATH = "/api/account/change-password";

/**
 * Changes the signed-in user's password.
 *
 * The backend ends every session the account had, this one included, and
 * answers with a token to carry on with. Keeping it is what stops the next
 * request from signing the user out.
 */
export async function changePassword(currentPassword, newPassword) {
  const { token, roles } = await apiFetch(CHANGE_PASSWORD_PATH, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  setSession(token, roles);
}
