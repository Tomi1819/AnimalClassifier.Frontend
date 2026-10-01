import { endSession, getToken, isSessionRequired } from "../auth/session.js";

// Empty during development so requests stay relative and the Vite dev proxy
// forwards them to the backend. See vite.config.js and .env.development.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const UNREACHABLE_MESSAGE = "Cannot reach the server. Please try again in a moment.";
const SESSION_EXPIRED_MESSAGE = "Your session has ended. Please sign in again.";

const UNAUTHORIZED_STATUS = 401;

// A proxy in front of the backend reports it as unreachable with one of these,
// and sends no body explaining them. The Vite dev proxy answers 502 this way
// whenever the backend is not running.
const GATEWAY_ERROR_STATUSES = new Set([502, 503, 504]);

// The status reported for a request that never produced a response at all.
const NO_RESPONSE_STATUS = 0;

/**
 * Thrown when the backend answered with a non-2xx status. The message is the
 * backend's own explanation, so it is safe to show to the user.
 */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Thrown when the backend never answered: it is not running, the network is
 * down, or a proxy in front of it could not reach it. Distinguishing this from
 * an ApiError keeps pages from blaming the user for a server that is offline.
 */
export class NetworkError extends Error {
  constructor(status, cause) {
    super(UNREACHABLE_MESSAGE, { cause });
    this.name = "NetworkError";
    this.status = status;
  }
}

/**
 * Resolves a server-relative path, such as an upload, to a URL the browser
 * can load directly.
 */
export function resolveUrl(path) {
  return `${API_BASE_URL}${path}`;
}

/**
 * Calls the backend with the current bearer token attached.
 *
 * Both error types carry a message meant for the user, so callers can report
 * `error.message` directly instead of guessing why the call failed.
 *
 * A token the backend rejects ends the session, since there is nothing the
 * caller can do about it.
 *
 * @returns the parsed JSON response, or null when the response has no body.
 * @throws {ApiError} when the backend responds with a non-2xx status.
 * @throws {NetworkError} when the backend cannot be reached at all.
 */
export async function apiFetch(path, options) {
  const response = await sendAuthorizedRequest(path, options);

  return response.status === 204 ? null : await response.json();
}

/**
 * Fetches a file from the backend, the same way `apiFetch` calls it.
 *
 * @returns the file's contents.
 * @throws {ApiError} when the backend responds with a non-2xx status.
 * @throws {NetworkError} when the backend cannot be reached at all.
 */
export async function apiDownload(path) {
  const response = await sendAuthorizedRequest(path);

  return await response.blob();
}

// Everything `apiFetch` and `apiDownload` share: the request with the token
// attached, and the answer checked, so that only a success is returned.
async function sendAuthorizedRequest(path, { headers, ...options } = {}) {
  const authorization = authorizationHeader();

  const response = await sendRequest(path, {
    ...options,
    headers: { ...authorization, ...contentTypeHeader(options.body), ...headers },
  });

  if (GATEWAY_ERROR_STATUSES.has(response.status)) {
    throw new NetworkError(response.status);
  }

  // Only a token that was actually sent can have been rejected. Without one, a
  // 401 is the endpoint's own answer -- a failed sign-in, say -- and belongs to
  // the caller. The exception is a page that needs a session: there the token
  // has run out or been signed out from under it, and the answer is the same.
  if (
    response.status === UNAUTHORIZED_STATUS &&
    (authorization.Authorization || isSessionRequired())
  ) {
    endSession();
    throw new ApiError(SESSION_EXPIRED_MESSAGE, response.status);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response;
}

// `fetch` rejects only when the request never reached the server; a response
// carrying an error status still resolves normally.
async function sendRequest(path, options) {
  try {
    return await fetch(resolveUrl(path), options);
  } catch (cause) {
    throw new NetworkError(NO_RESPONSE_STATUS, cause);
  }
}

function authorizationHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// FormData bodies must keep the boundary the browser generates for them.
function contentTypeHeader(body) {
  return body instanceof FormData ? {} : { "Content-Type": "application/json" };
}

// The backend reports errors both as { message } objects and as plain strings.
async function readErrorMessage(response) {
  const body = await response.text();
  if (!body) {
    return response.statusText;
  }

  try {
    return JSON.parse(body).message ?? body;
  } catch {
    return body;
  }
}
