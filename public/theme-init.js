// Picks the theme before the page is first painted, so a dark page never
// flashes light while it loads. It is a classic script in the <head>, served
// as is from public/, because a module would only run once the page is
// parsed; src/shared/theme.js takes over from there and shares its storage
// key and values.
(() => {
  const STORAGE_KEY = "theme";

  let preference = null;
  try {
    preference = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked: light, as with no choice made.
  }

  document.documentElement.dataset.theme = preference === "dark" ? "dark" : "light";
})();
