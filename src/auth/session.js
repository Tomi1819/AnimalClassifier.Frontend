const TOKEN_KEY = "token";
const ROLES_KEY = "roles";
const ADMIN_ROLE = "Admin";
const LOGIN_PAGE = "/pages/login.html";
const DASHBOARD_PAGE = "/pages/dashboard.html";
const MILLISECONDS_PER_SECOND = 1000;

// The backend writes .NET's ClaimTypes.Email without mapping it to the short
// JWT name, so the long form is the one it sends; the short one is the
// standard, and is read first in case that changes.
const EMAIL_CLAIMS = [
  "email",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
];

/**
 * The token is kept in localStorage rather than sessionStorage so that every
 * tab and window shares one session.
 *
 * The trade is that it also outlives the browser being closed, so a token is
 * checked against its own expiry before being handed out, and a token the
 * backend rejects ends the session outright. See endSession.
 */
export function getToken() {
  const token = readToken();

  if (token !== null && hasExpired(token)) {
    clearSession();
    return null;
  }

  return token;
}

export function setSession(token, roles) {
  withStorage(() => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
  });
}

export function clearSession() {
  withStorage(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLES_KEY);
  });
}

export function isAuthenticated() {
  return getToken() !== null;
}

/**
 * Only decides what the page offers; the backend checks the role on every
 * request regardless.
 */
export function isAdmin() {
  return isAuthenticated() && readRoles().includes(ADMIN_ROLE);
}

/**
 * The email the signed-in user is known by, for showing who is signed in.
 *
 * @returns the email, or null when no one is signed in or the token has none.
 */
export function getUserEmail() {
  const token = getToken();
  if (token === null) {
    return null;
  }

  const claims = readClaims(token);
  const email = EMAIL_CLAIMS.map((claim) => claims?.[claim]).find(Boolean);
  return email ?? null;
}

/**
 * Guards a page that requires a signed-in user, redirecting to the login page
 * when there is none.
 *
 * @returns whether the page may continue initialising.
 */
export function requireAuthentication() {
  if (isAuthenticated()) {
    return true;
  }

  redirectToLogin();
  return false;
}

/**
 * Guards a page that requires an administrator, sending anyone else who is
 * signed in to the dashboard.
 *
 * @returns whether the page may continue initialising.
 */
export function requireAdmin() {
  if (!requireAuthentication()) {
    return false;
  }

  if (isAdmin()) {
    return true;
  }

  window.location.href = DASHBOARD_PAGE;
  return false;
}

/**
 * Ends the session once the backend has rejected the token, and returns the
 * user to the login page.
 */
export function endSession() {
  clearSession();
  redirectToLogin();
}

function redirectToLogin() {
  // Guarded so that a rejected request made from the login page itself cannot
  // send the browser round in a loop.
  if (window.location.pathname !== LOGIN_PAGE) {
    window.location.href = LOGIN_PAGE;
  }
}

function readToken() {
  return withStorage(() => localStorage.getItem(TOKEN_KEY)) ?? null;
}

function readRoles() {
  return JSON.parse(withStorage(() => localStorage.getItem(ROLES_KEY)) ?? "[]");
}

// Storage throws rather than returning nothing when a browser blocks it, which
// must not stop the page from loading.
function withStorage(operation) {
  try {
    return operation();
  } catch (error) {
    console.error("The browser would not let the session be stored:", error);
    return null;
  }
}

/**
 * Reads the expiry the backend put in the token, so a session that has already
 * run out is not treated as a signed-in one.
 */
function hasExpired(token) {
  const claims = readClaims(token);

  // A token that carries no expiry is left for the backend to judge.
  if (typeof claims?.exp !== "number") {
    return false;
  }

  return claims.exp * MILLISECONDS_PER_SECOND <= Date.now();
}

function readClaims(token) {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    // JWT payloads are base64url, which differs from base64 in two characters
    // and carries no padding.
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(base64 + padding), (character) =>
      character.charCodeAt(0),
    );

    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    console.error("Could not read the token's claims:", error);
    return null;
  }
}
