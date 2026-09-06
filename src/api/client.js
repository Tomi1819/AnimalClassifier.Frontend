import { getToken } from "../auth/session.js";

// Empty during development so requests stay relative and the Vite dev proxy
// forwards them to the backend. See vite.config.js and .env.development.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
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
 * @returns the parsed JSON response, or null when the response has no body.
 * @throws {ApiError} when the backend responds with a non-2xx status.
 */
export async function apiFetch(path, { headers, ...options } = {}) {
  const response = await fetch(resolveUrl(path), {
    ...options,
    headers: { ...authorizationHeader(), ...contentTypeHeader(options.body), ...headers },
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  return response.status === 204 ? null : await response.json();
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
