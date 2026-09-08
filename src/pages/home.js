import { isAuthenticated } from "../auth/session.js";
import { initNavigation } from "../shared/nav.js";

const SIGN_UP_ACTION_SELECTOR = "[data-sign-up-action]";
const ACTION_LABEL_SELECTOR = ".action__label";
const SIGN_IN_ACTION_ID = "signInAction";

const DASHBOARD_PAGE = "/pages/dashboard.html";
const DASHBOARD_LABEL = "Open your dashboard";

initNavigation();
initCallsToAction();

/**
 * Sends a visitor who is already signed in straight to the dashboard, rather
 * than through a sign-up form they no longer need.
 */
function initCallsToAction() {
  if (!isAuthenticated()) {
    return;
  }

  for (const action of document.querySelectorAll(SIGN_UP_ACTION_SELECTOR)) {
    action.href = DASHBOARD_PAGE;
    // Only the wording changes; the trailing arrow is left in place.
    action.querySelector(ACTION_LABEL_SELECTOR).textContent = DASHBOARD_LABEL;
  }

  const signInAction = document.getElementById(SIGN_IN_ACTION_ID);
  if (signInAction) {
    signInAction.hidden = true;
  }
}
