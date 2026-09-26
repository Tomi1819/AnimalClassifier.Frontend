import { clearSession } from "../auth/session.js";
import { initDisclosure } from "./disclosure.js";
import { svgIcon } from "./icons.js";
import { describeSignedInUser } from "./signed-in-user.js";
import { createThemeSwitch } from "./theme-switch.js";

const PANEL_ID = "accountMenu";
const TOGGLE_LABEL = "Account and settings";
const HOME_PAGE = "/";

const UNKNOWN_EMAIL = "Signed in";

const ACCOUNT_ITEM = {
  href: "/pages/account.html",
  label: "Account",
  hint: "Settings and security",
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
 * account, how the site looks to them, and the way out. It is only for a signed-in user.
 *
 * @returns the element to place in the bar.
 */
export function createAccountMenu() {
  const user = describeSignedInUser();
  const items = user.admin ? [ACCOUNT_ITEM, ADMIN_ITEM] : [ACCOUNT_ITEM];

  const toggle = createToggle(items.some(({ href }) => isCurrentPage(href)));
  const panel = createPanel(items, user);
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

function createPanel(items, user) {
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.className = "account-menu__panel";

  const list = document.createElement("ul");
  list.className = "account-menu__list";
  list.append(...items.map(createLinkItem));

  panel.append(createIdentity(user), list, createThemeSwitch(), createSignOut());
  return panel;
}

function createIdentity({ email, initial, roleLabel, admin }) {
  const identity = document.createElement("div");
  identity.className = "account-menu__identity";
  identity.innerHTML = `
    <span class="avatar account-menu__avatar" aria-hidden="true"></span>
    <span class="account-menu__who">
      <span class="account-menu__email"></span>
      <span class="role-badge"></span>
    </span>
  `;

  // Filled in as text, since the email is the user's own input. The title
  // carries it whole for when it is too long for the panel.
  const emailText = identity.querySelector(".account-menu__email");
  emailText.textContent = email ?? UNKNOWN_EMAIL;
  emailText.title = email ?? "";
  identity.querySelector(".account-menu__avatar").textContent = initial;

  const role = identity.querySelector(".role-badge");
  role.textContent = roleLabel;
  role.classList.toggle("role-badge--admin", admin);

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

function isCurrentPage(href) {
  return href === window.location.pathname;
}

function signOut() {
  clearSession();
  window.location.href = HOME_PAGE;
}
