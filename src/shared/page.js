import { requireAdmin, requireAuthentication } from "../auth/session.js";
import { initNavigation } from "./nav.js";
import { initTheme } from "./theme.js";

/**
 * Who a page is for.
 */
export const PAGE_ACCESS = Object.freeze({
  ANYONE: "anyone",
  SIGNED_IN: "signedIn",
  ADMIN: "admin",
});

/**
 * Starts a page the way every page starts: it lets in only who the page is
 * for, then follows the theme and draws the navigation.
 *
 * The guard runs first, so a page the user is about to be sent away from never
 * paints the signed-in navigation over an expired session. Module scripts are
 * deferred, so the document is already parsed by the time this runs.
 *
 * @param access one of PAGE_ACCESS.
 * @returns whether the page may go on to set itself up. When it may not, the
 *   browser is already on its way elsewhere.
 */
export function initPage(access = PAGE_ACCESS.ANYONE) {
  if (!admit(access)) {
    return false;
  }

  initTheme();
  initNavigation();
  return true;
}

function admit(access) {
  switch (access) {
    case PAGE_ACCESS.SIGNED_IN:
      return requireAuthentication();
    case PAGE_ACCESS.ADMIN:
      return requireAdmin();
    default:
      return true;
  }
}
