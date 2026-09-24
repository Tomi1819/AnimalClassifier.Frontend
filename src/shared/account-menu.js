import { clearSession, getUserEmail, isAdmin } from "../auth/session.js";
import { initDisclosure } from "./disclosure.js";

const PANEL_ID = "accountMenu";
const TOGGLE_LABEL = "Account and settings";
const HOME_PAGE = "/";

const ADMIN_ROLE_LABEL = "Administrator";
const MEMBER_ROLE_LABEL = "Member";
const UNKNOWN_EMAIL = "Signed in";

// Outline icons drawn on a 24-unit grid, stroked in the text colour so that
// they follow the state of whatever holds them.
const ICONS = {
  settings: `
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" />
    <circle cx="12" cy="12" r="3" />
  `,
  account: `
    <circle cx="12" cy="8" r="4" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  `,
  admin: `
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
    <path d="m9 12 2 2 4-4" />
  `,
  signOut: `
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5M21 12H9" />
  `,
};

const ACCOUNT_ITEM = {
  href: "/pages/account.html",
  label: "Account",
  hint: "Passkeys and sign in",
  icon: "account",
};

const ADMIN_ITEM = {
  href: "/pages/admin.html",
  label: "Admin",
  hint: "Users and audit log",
  icon: "admin",
};

/**
 * Builds the menu that gathers everything about the signed-in user behind one
 * button at the end of the bar: who they are, the pages that concern their
 * account, and the way out. It is only for a signed-in user.
 *
 * @returns the element to place in the bar.
 */
export function createAccountMenu() {
  const admin = isAdmin();
  const items = admin ? [ACCOUNT_ITEM, ADMIN_ITEM] : [ACCOUNT_ITEM];

  const toggle = createToggle(items.some(({ href }) => isCurrentPage(href)));
  const panel = createPanel(items, admin);
  initDisclosure(toggle, panel);

  const menu = document.createElement("div");
  menu.className = "account-menu";
  menu.append(toggle, panel);
  return menu;
}

function createToggle(holdsCurrentPage) {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "account-menu__toggle";
  toggle.innerHTML = svgIcon("settings", "account-menu__gear");
  toggle.setAttribute("aria-label", TOGGLE_LABEL);

  // The bar marks the page on screen, and on the account pages that page is
  // inside the menu, so the button stands in for it.
  toggle.classList.toggle("is-current", holdsCurrentPage);
  return toggle;
}

function createPanel(items, admin) {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.className = "account-menu__panel";

  const list = document.createElement("ul");
  list.className = "account-menu__list";
  list.append(...items.map(createLinkItem));

  panel.append(createIdentity(admin), list, createSignOut());
  return panel;
}

function createIdentity(admin) {
  const email = getUserEmail();

  const identity = document.createElement("div");
  identity.className = "account-menu__identity";
  identity.innerHTML = `
    <span class="account-menu__avatar" aria-hidden="true"></span>
    <span class="account-menu__who">
      <span class="account-menu__email"></span>
      <span class="account-menu__role"></span>
    </span>
  `;

  // Filled in as text, since the email is the user's own input. The title
  // carries it whole for when it is too long for the panel.
  const emailText = identity.querySelector(".account-menu__email");
  emailText.textContent = email ?? UNKNOWN_EMAIL;
  emailText.title = email ?? "";
  identity.querySelector(".account-menu__avatar").textContent = initialOf(email);

  const role = identity.querySelector(".account-menu__role");
  role.textContent = admin ? ADMIN_ROLE_LABEL : MEMBER_ROLE_LABEL;
  role.classList.toggle("account-menu__role--admin", admin);

  return identity;
}

function createLinkItem({ href, label, hint, icon }) {
  const link = document.createElement("a");
  link.href = href;
  link.className = "account-menu__item";
  link.innerHTML = itemContent(icon);
  fillItemText(link, label, hint);

  if (isCurrentPage(href)) {
    link.setAttribute("aria-current", "page");
  }

  const item = document.createElement("li");
  item.append(link);
  return item;
}

function createSignOut() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "account-menu__item account-menu__item--danger";
  button.innerHTML = itemContent("signOut");
  fillItemText(button, "Sign out", "End this session");
  button.addEventListener("click", signOut);

  const footer = document.createElement("div");
  footer.className = "account-menu__footer";
  footer.append(button);
  return footer;
}

function itemContent(iconName) {
  return `
    <span class="account-menu__badge">${svgIcon(iconName, "account-menu__icon")}</span>
    <span class="account-menu__text">
      <span class="account-menu__label"></span>
      <span class="account-menu__hint"></span>
    </span>
  `;
}

function fillItemText(item, label, hint) {
  item.querySelector(".account-menu__label").textContent = label;
  item.querySelector(".account-menu__hint").textContent = hint;
}

function svgIcon(name, className) {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
}

function initialOf(email) {
  return email ? email.charAt(0).toUpperCase() : "?";
}

function isCurrentPage(href) {
  return href === window.location.pathname;
}

function signOut() {
  clearSession();
  window.location.href = HOME_PAGE;
}
