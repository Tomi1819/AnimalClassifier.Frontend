import { initAccountHeader } from "../account/account-header.js";
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
  await initPasskeySection();
}
