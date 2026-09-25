import { svgIcon } from "./icons.js";
import {
  THEME_PREFERENCES,
  getThemePreference,
  onThemePreferenceChange,
  setThemePreference,
} from "./theme.js";

const LABEL_ID = "themeSwitchLabel";
const LABEL = "Theme";

const OPTIONS = [
  { preference: THEME_PREFERENCES.LIGHT, label: "Light", icon: "sun" },
  { preference: THEME_PREFERENCES.DARK, label: "Dark", icon: "moon" },
];

/**
 * Builds the control that picks the theme, light or dark. It shows the choice
 * as it stands, including one made in another tab, and applies a new one at
 * once.
 *
 * @returns the element to place in a menu or a page.
 */
export function createThemeSwitch() {
  const buttons = OPTIONS.map(createOption);

  const group = document.createElement("div");
  group.className = "segmented segmented--fill";
  group.setAttribute("role", "group");
  group.setAttribute("aria-labelledby", LABEL_ID);
  group.append(...buttons);

  group.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button) {
      setThemePreference(button.dataset.themePreference);
    }
  });

  const showPreference = (preference) => markSelected(buttons, preference);
  showPreference(getThemePreference());
  onThemePreferenceChange(showPreference);

  const label = document.createElement("span");
  label.id = LABEL_ID;
  label.className = "theme-switch__label";
  label.textContent = LABEL;

  const container = document.createElement("div");
  container.className = "theme-switch";
  container.append(label, group);
  return container;
}

function createOption({ preference, label, icon }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "segmented__btn theme-switch__option";
  button.dataset.themePreference = preference;
  button.innerHTML = `${svgIcon(icon, "theme-switch__icon")}<span></span>`;
  button.querySelector("span").textContent = label;
  return button;
}

// A pressed button is how a group of toggles announces which one is on.
function markSelected(buttons, preference) {
  for (const button of buttons) {
    const selected = button.dataset.themePreference === preference;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  }
}
