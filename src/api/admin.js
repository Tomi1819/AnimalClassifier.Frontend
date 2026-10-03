import { apiFetch } from "./client.js";

const USERS_PATH = "/api/admin/users";
const AUDIT_PATH = "/api/admin/audit";

/**
 * One page of the users whose name or email contains the search term, newest
 * first.
 *
 * @param search the term, which an empty one leaves every user matching.
 * @param page counted from 1.
 * @returns `{ items, page, pageSize, totalCount }`, where each of the items is
 *   `{ id, fullName, email, dateRegistered, isAdmin, isLocked, recognitionCount }`.
 */
export function getUsers(search, page) {
  return apiFetch(`${USERS_PATH}?${new URLSearchParams({ search, page })}`);
}

/**
 * One user's recognitions, as their own history lists them.
 */
export function getUserHistory(userId) {
  return apiFetch(`${userPath(userId)}/history`);
}

// Each of the changes below ends the user's sessions, is recorded in the audit
// log, and is refused for the administrator's own account.

export function lockUser(userId) {
  return changeUser(userId, "lock");
}

export function unlockUser(userId) {
  return changeUser(userId, "unlock");
}

export function grantAdmin(userId) {
  return changeUser(userId, "grant-admin");
}

export function revokeAdmin(userId) {
  return changeUser(userId, "revoke-admin");
}

/**
 * One page of the audit log, most recent first.
 *
 * @param page counted from 1.
 * @returns `{ items, page, pageSize, totalCount }`, where each of the items is
 *   `{ action, datePerformed, adminEmail, userEmail }`.
 */
export function getAuditLog(page) {
  return apiFetch(`${AUDIT_PATH}?${new URLSearchParams({ page })}`);
}

function changeUser(userId, change) {
  return apiFetch(`${userPath(userId)}/${change}`, { method: "POST" });
}

function userPath(userId) {
  return `${USERS_PATH}/${encodeURIComponent(userId)}`;
}
