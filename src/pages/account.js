import { initAccountHeader } from "../account/account-header.js";
import { initDeleteAccountSection } from "../account/delete-account-section.js";
import { initNameSection } from "../account/name-section.js";
import { initOtherSessionsSection } from "../account/other-sessions-section.js";
import { initPasskeySection } from "../account/passkey-section.js";
import { initPasswordSection } from "../account/password-section.js";
import { requireAuthentication } from "../auth/session.js";
import { initNavigation } from "../shared/nav.js";
import { initPasswordToggles } from "../shared/password-toggle.js";
import { initTheme } from "../shared/theme.js";

if (requireAuthentication()) {
  initTheme();
  initNavigation();
  initPasswordToggles();

  initAccountHeader();
  initPasswordSection();
  initOtherSessionsSection();
  initDeleteAccountSection();

  // Each waits on the backend, so they load side by side.
  await Promise.all([initNameSection(), initPasskeySection()]);
}
