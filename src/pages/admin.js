import { apiFetch } from "../api/client.js";
import { requireAdmin } from "../auth/session.js";
import { showError, showSuccess } from "../shared/feedback.js";
import { createHistoryCard, formatDate, fromHistoryItem } from "../shared/history.js";
import { initNavigation } from "../shared/nav.js";

const USERS_PATH = "/api/admin/users";
const AUDIT_PATH = "/api/admin/audit";
const CONFIRM = "confirm";

// Keyed by the endpoint each change is posted to.
const USER_CHANGES = {
  lock: {
    label: "Lock",
    question: (email) => `Lock ${email}? They will not be able to sign in until unlocked.`,
    done: "The account is locked.",
  },
  unlock: {
    label: "Unlock",
    question: (email) => `Unlock ${email}?`,
    done: "The account is unlocked.",
  },
  "grant-admin": {
    label: "Make admin",
    question: (email) => `Make ${email} an administrator?`,
    done: "The user is now an administrator.",
  },
  "revoke-admin": {
    label: "Remove admin",
    question: (email) => `Remove ${email} as an administrator?`,
    done: "The user is no longer an administrator.",
  },
};

const AUDIT_ACTIONS = {
  Lock: "Locked",
  Unlock: "Unlocked",
  GrantAdmin: "Made admin",
  RevokeAdmin: "Removed admin",
};

// The page of users on screen, which a change reloads.
let usersPage = 1;

// Module scripts are deferred, so the document is already parsed here.
// The guard runs first, so a non-administrator never paints the page.
if (requireAdmin()) {
  initNavigation();

  const page = collectPageElements();
  initSearch(page);
  page.closeHistory.addEventListener("click", () => {
    page.historySection.hidden = true;
  });

  await Promise.all([showUsers(page, 1), showAuditLog(page, 1)]);
}

function collectPageElements() {
  return {
    status: document.getElementById("adminStatus"),
    searchForm: document.getElementById("userSearchForm"),
    searchInput: document.getElementById("userSearch"),
    usersBody: document.getElementById("usersBody"),
    usersPager: document.getElementById("usersPager"),
    auditBody: document.getElementById("auditBody"),
    auditPager: document.getElementById("auditPager"),
    historySection: document.getElementById("historySection"),
    historyTitle: document.getElementById("historyTitle"),
    historyEmpty: document.getElementById("historyEmpty"),
    historyList: document.getElementById("historyList"),
    closeHistory: document.getElementById("closeHistory"),
    confirmDialog: document.getElementById("confirmDialog"),
    confirmQuestion: document.getElementById("confirmQuestion"),
  };
}

/* -------------------------------------------------------------------------
   Users
   ------------------------------------------------------------------------- */

function initSearch(page) {
  page.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    showUsers(page, 1);
  });
}

async function showUsers(page, pageNumber) {
  const query = new URLSearchParams({ search: page.searchInput.value.trim(), page: pageNumber });

  try {
    const result = await apiFetch(`${USERS_PATH}?${query}`);

    usersPage = pageNumber;
    page.usersBody.replaceChildren(
      ...(result.items.length > 0
        ? result.items.map((user) => createUserRow(page, user))
        : [createEmptyRow("No users match the search.", 5)]),
    );
    renderPager(page.usersPager, result, (next) => showUsers(page, next));
  } catch (error) {
    console.error("Could not load the users:", error);
    showError(page.status, error.message);
  }
}

function createUserRow(page, user) {
  const name = document.createElement("span");
  name.className = "admin-table__name";
  name.textContent = user.fullName;

  const email = document.createElement("span");
  email.className = "admin-table__email";
  email.textContent = user.email;

  const status = [];
  if (user.isAdmin) {
    status.push(createBadge("Admin", "badge"));
  }
  if (user.isLocked) {
    status.push(createBadge("Locked", "badge badge--locked"));
  }

  const actions = createCell(
    createButton("History", () => showHistory(page, user)),
    createChangeButton(page, user, user.isLocked ? "unlock" : "lock"),
    createChangeButton(page, user, user.isAdmin ? "revoke-admin" : "grant-admin"),
  );
  actions.className = "admin-table__actions";

  const row = document.createElement("tr");
  row.append(
    createCell(name, email),
    createCell(formatDate(user.dateRegistered)),
    createCell(user.recognitionCount),
    createCell(...status),
    actions,
  );
  return row;
}

function createChangeButton(page, user, change) {
  return createButton(USER_CHANGES[change].label, () => changeUser(page, user, change));
}

async function changeUser(page, user, change) {
  const { question, done } = USER_CHANGES[change];

  if (!(await askToConfirm(page, question(user.email)))) {
    return;
  }

  try {
    await apiFetch(`${USERS_PATH}/${user.id}/${change}`, { method: "POST" });
    showSuccess(page.status, done);
    await Promise.all([showUsers(page, usersPage), showAuditLog(page, 1)]);
  } catch (error) {
    console.error(`Could not ${change} the user:`, error);
    // The backend explains a refused change, such as an administrator
    // changing their own account.
    showError(page.status, error.message);
  }
}

function askToConfirm(page, question) {
  const dialog = page.confirmDialog;
  page.confirmQuestion.textContent = question;
  // Escape closes the dialog without a button, leaving the previous answer.
  dialog.returnValue = "";
  dialog.showModal();

  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === CONFIRM), {
      once: true,
    });
  });
}

async function showHistory(page, user) {
  try {
    const history = await apiFetch(`${USERS_PATH}/${user.id}/history`);

    page.historyTitle.textContent = `History of ${user.email}`;
    page.historyList.replaceChildren(
      ...history.map((item) => createHistoryCard(fromHistoryItem(item))),
    );
    page.historyEmpty.hidden = history.length > 0;
    page.historySection.hidden = false;
    page.historySection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    console.error("Could not load the history:", error);
    showError(page.status, error.message);
  }
}

/* -------------------------------------------------------------------------
   Audit log
   ------------------------------------------------------------------------- */

async function showAuditLog(page, pageNumber) {
  try {
    const result = await apiFetch(`${AUDIT_PATH}?page=${pageNumber}`);

    page.auditBody.replaceChildren(
      ...(result.items.length > 0
        ? result.items.map(createAuditRow)
        : [createEmptyRow("No changes have been made yet.", 4)]),
    );
    renderPager(page.auditPager, result, (next) => showAuditLog(page, next));
  } catch (error) {
    console.error("Could not load the audit log:", error);
    showError(page.status, error.message);
  }
}

function createAuditRow({ action, datePerformed, adminEmail, userEmail }) {
  const row = document.createElement("tr");
  row.append(
    createCell(formatDate(datePerformed)),
    createCell(adminEmail),
    createCell(AUDIT_ACTIONS[action] ?? action),
    createCell(userEmail),
  );
  return row;
}

/* -------------------------------------------------------------------------
   Shared building blocks
   ------------------------------------------------------------------------- */

function renderPager(pager, { page, pageSize, totalCount }, onPage) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  const label = document.createElement("span");
  label.textContent = `Page ${page} of ${pageCount}`;

  const previous = createButton("Previous", () => onPage(page - 1));
  previous.disabled = page <= 1;

  const next = createButton("Next", () => onPage(page + 1));
  next.disabled = page >= pageCount;

  pager.replaceChildren(previous, label, next);
}

function createCell(...contents) {
  const cell = document.createElement("td");
  cell.append(...contents);
  return cell;
}

function createEmptyRow(text, columns) {
  const cell = createCell(text);
  cell.colSpan = columns;
  cell.className = "admin-table__empty";

  const row = document.createElement("tr");
  row.append(cell);
  return row;
}

function createButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn-ghost";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createBadge(text, className) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.textContent = text;
  return badge;
}
