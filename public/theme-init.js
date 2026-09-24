// Picks the theme before the page is first painted, so a dark page never
// flashes light while it loads. It is a classic script in the <head>, served
// as is from public/, because a module would only run once the page is
// parsed; src/shared/theme.js takes over from there and shares its storage
// key and values.
(() => {
  const STORAGE_KEY = "theme";
  const DARK_QUERY = "(prefers-color-scheme: dark)";

  let preference = null;
  try {
    preference = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked: follow the system, as with no choice made.
  }

  const dark =
    preference === "dark" || (preference !== "light" && window.matchMedia(DARK_QUERY).matches);

  document.documentElement.dataset.theme = dark ? "dark" : "light";
})();
