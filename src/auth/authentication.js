import { apiFetch } from "../api/client.js";

const REGISTER_PATH = "/api/auth/register";
const SIGN_IN_PATH = "/api/auth/login";
const FORGOT_PASSWORD_PATH = "/api/auth/forgot-password";
const RESET_PASSWORD_PATH = "/api/auth/reset-password";

/**
 * Creates an account. Nobody is signed in by it: the user does that next, with
 * the password they have just chosen.
 */
export function register(fullName, email, password) {
  return post(REGISTER_PATH, { fullName, email, password });
}

/**
 * Signs in with the account's password.
 *
 * @returns the session, as `{ token, roles }`.
 */
export function signInWithPassword(email, password) {
  return post(SIGN_IN_PATH, { email, password });
}

/**
 * Asks for a link to choose a new password with, emailed to the address.
 *
 * @returns `{ message }`. The backend answers the same way whether or not the
 *   address has an account, and words the message for that.
 */
export function requestPasswordReset(email) {
  return post(FORGOT_PASSWORD_PATH, { email });
}

/**
 * Sets a new password, using the address and the token an emailed link
 * carries.
 *
 * @returns `{ message }` confirming the change.
 */
export function resetPassword(email, token, newPassword) {
  return post(RESET_PASSWORD_PATH, { email, token, newPassword });
}

function post(path, body) {
  return apiFetch(path, { method: "POST", body: JSON.stringify(body) });
}
