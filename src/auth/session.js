const TOKEN_KEY = "token";
const LOGIN_PAGE = "/pages/login.html";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated() {
  return getToken() !== null;
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

  window.location.href = LOGIN_PAGE;
  return false;
}
