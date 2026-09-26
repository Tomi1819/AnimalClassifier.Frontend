import { getUserEmail, isAdmin } from "../auth/session.js";

const ADMIN_ROLE_LABEL = "Administrator";
const MEMBER_ROLE_LABEL = "Member";
const UNKNOWN_INITIAL = "?";

/**
 * Who is signed in, in the form every place that shows them needs: the
 * account menu and the account page.
 *
 * @returns the user's email (null when the token carries none), the initial
 *   their avatar shows, their role as a label, and whether they are an
 *   administrator.
 */
export function describeSignedInUser() {
  const email = getUserEmail();
  const admin = isAdmin();

  return {
    email,
    initial: email ? email.charAt(0).toUpperCase() : UNKNOWN_INITIAL,
    roleLabel: admin ? ADMIN_ROLE_LABEL : MEMBER_ROLE_LABEL,
    admin,
  };
}
