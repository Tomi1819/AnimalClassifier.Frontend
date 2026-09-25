// Shared with public/theme-init.js, which applies the saved choice before the
// page is painted; this module keeps it in step from then on.
const STORAGE_KEY = "theme";

export const THEME_PREFERENCES = Object.freeze({
  LIGHT: "light",
  DARK: "dark",
});

const listeners = new Set();

// Held here as well as in storage, so a choice still applies to this page when
// the browser will not let it be saved.
let currentPreference = readStoredPreference();

/**
 * Keeps the page's theme following the user's choice, including one made in
 * another tab.
 */
export function initTheme() {
  applyTheme();

  window.addEventListener("storage", (event) => {
    // A null key means storage was cleared, which resets the choice as well.
    if (event.key === STORAGE_KEY || event.key === null) {
      currentPreference = readStoredPreference();
      applyTheme();
      notifyListeners();
    }
  });
}

/**
 * @returns one of THEME_PREFERENCES, LIGHT when nothing has been chosen.
 */
export function getThemePreference() {
  return currentPreference;
}

/**
 * Saves the choice and applies it at once.
 *
 * @param preference one of THEME_PREFERENCES.
 */
export function setThemePreference(preference) {
  currentPreference = preference;
  writeStoredPreference(preference);
  applyTheme();
  notifyListeners();
}

/**
 * Calls the listener with the new preference whenever it changes, whether here
 * or in another tab.
 */
export function onThemePreferenceChange(listener) {
  listeners.add(listener);
}

function applyTheme() {
  document.documentElement.dataset.theme = currentPreference;
}

function notifyListeners() {
  for (const listener of listeners) {
    listener(currentPreference);
  }
}

// Storage throws rather than returning nothing when a browser blocks it. The
// choice then lasts only as long as the page, which is no reason to fail.
function readStoredPreference() {
  let stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("The browser would not let the theme be read:", error);
  }

  return stored === THEME_PREFERENCES.DARK ? THEME_PREFERENCES.DARK : THEME_PREFERENCES.LIGHT;
}

function writeStoredPreference(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch (error) {
    console.error("The browser would not let the theme be saved:", error);
  }
}
