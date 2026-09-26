import { describeSignedInUser } from "../shared/signed-in-user.js";

/**
 * Heads the page with whose account it is, drawn the way the account menu
 * draws them.
 */
export function initAccountHeader() {
  const { email, initial, roleLabel, admin } = describeSignedInUser();

  document.getElementById("accountAvatar").textContent = initial;

  // Filled in as text, since the email is the user's own input. Without one,
  // the heading keeps the words it was served with.
  if (email) {
    document.getElementById("accountEmail").textContent = email;
  }

  const role = document.getElementById("accountRole");
  role.textContent = roleLabel;
  role.classList.toggle("role-badge--admin", admin);
}
