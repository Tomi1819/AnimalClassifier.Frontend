import { isAuthenticated } from "../auth/session.js";
import { createAccountMenu } from "./account-menu.js";
import { initDisclosure } from "./disclosure.js";

const NAV_LINKS_ID = "navLinks";
const HOME_PAGE = "/";

// Matches the width at which the stylesheet drops the links out of the bar.
const COMPACT_NAV_QUERY = "(max-width: 560px)";

const MENU_LABEL = "Menu";
const ICON_SELECTOR = "[data-icon]";

const AUTHENTICATED_LINKS = [
  { href: HOME_PAGE, label: "Home" },
  { href: "/pages/dashboard.html", label: "Dashboard" },
  { href: "/pages/search.html", label: "Search" },
  { href: "/pages/statistics.html", label: "Statistics" },
];

const ANONYMOUS_LINKS = [
  { href: HOME_PAGE, label: "Home" },
  { href: "/pages/register.html", label: "Register" },
  { href: "/pages/login.html", label: "Login" },
];

const MENU_ICONS = `
  <svg class="nav-toggle__icon" data-icon="open" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
  <svg class="nav-toggle__icon" data-icon="close" viewBox="0 0 24 24" aria-hidden="true" hidden>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
`;

/**
 * Renders the navigation for the current session. Pages only need to provide
 * an empty <ul id="navLinks">; the links themselves live here so that every
 * page stays consistent.
 */
export function initNavigation() {
  const navLinks = document.getElementById(NAV_LINKS_ID);
  if (!navLinks) {
    return;
  }

  const signedIn = isAuthenticated();
  const links = signedIn ? AUTHENTICATED_LINKS : ANONYMOUS_LINKS;
  navLinks.replaceChildren(...links.map(createNavItem));

  // The account pages and signing out sit behind a menu of their own, so the
  // links stay the pages the user works in.
  if (signedIn) {
    navLinks.after(createAccountMenu());
  }

  initMenu(navLinks);
}

function createNavItem({ href, label }) {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;

  if (href === window.location.pathname) {
    link.classList.add("active");
  }

  const item = document.createElement("li");
  item.append(link);
  return item;
}

/**
 * Adds the button that opens the links on a narrow screen, where the bar has
 * no room to lay them out. It is built here rather than in the pages so that
 * they carry on providing nothing but the empty list.
 */
function initMenu(navLinks) {
  const toggle = createMenuToggle();
  navLinks.before(toggle);

  const close = initDisclosure(toggle, navLinks, (open) => showMenuIcon(toggle, open));

  // The menu belongs to the compact bar alone, so a window grown past it must
  // not leave the panel behind.
  window.matchMedia(COMPACT_NAV_QUERY).addEventListener("change", (event) => {
    if (!event.matches) {
      close();
    }
  });
}

function createMenuToggle() {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "nav-toggle";
  toggle.innerHTML = MENU_ICONS;
  toggle.setAttribute("aria-label", MENU_LABEL);
  return toggle;
}

function showMenuIcon(toggle, open) {
  // The icon offers the next action, so it is the opposite of the state. It is
  // SVG, which carries no hidden property to assign to, only the attribute the
  // stylesheet matches on.
  const visibleIcon = open ? "close" : "open";
  for (const icon of toggle.querySelectorAll(ICON_SELECTOR)) {
    icon.toggleAttribute("hidden", icon.dataset.icon !== visibleIcon);
  }
}
