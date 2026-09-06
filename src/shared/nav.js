import { clearToken, isAuthenticated } from "../auth/session.js";

const NAV_LINKS_ID = "navLinks";
const HOME_PAGE = "/";

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

  const links = isAuthenticated() ? AUTHENTICATED_LINKS : ANONYMOUS_LINKS;
  navLinks.replaceChildren(...links.map(createNavItem));

  if (isAuthenticated()) {
    navLinks.append(createLogoutItem());
  }
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

function createLogoutItem() {
  const link = document.createElement("a");
  link.href = "#";
  link.textContent = "Logout";
  link.addEventListener("click", (event) => {
    event.preventDefault();
    logout();
  });

  const item = document.createElement("li");
  item.append(link);
  return item;
}

function logout() {
  clearToken();
  window.location.href = HOME_PAGE;
}
