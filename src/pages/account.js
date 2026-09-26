import { initPasskeySection } from "../account/passkey-section.js";
import { requireAuthentication } from "../auth/session.js";
import { initNavigation } from "../shared/nav.js";
import { initTheme } from "../shared/theme.js";

if (requireAuthentication()) {
  initTheme();
  initNavigation();

  await initPasskeySection();
}
