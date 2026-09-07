import { getToken } from "../auth/session.js";

// Empty during development so requests stay relative and the Vite dev proxy
// forwards them to the backend. See vite.config.js and .env.development.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const UNREACHABLE_MESSAGE = "Cannot reach the server. Please try again in a moment.";

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
 * @returns the parsed JSON response, or null when the response has no body.
 * @throws {ApiError} when the backend responds with a non-2xx status.
 * @throws {NetworkError} when the backend cannot be reached at all.
 */
export async function apiFetch(path, { headers, ...options } = {}) {
  const response = await sendRequest(path, {
    ...options,
    headers: { ...authorizationHeader(), ...contentTypeHeader(options.body), ...headers },
  });

  if (GATEWAY_ERROR_STATUSES.has(response.status)) {
    throw new NetworkError(response.status);
  }

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.status === 204 ? null : await response.json();
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
