import { initAccountHeader } from "../account/account-header.js";
import { initDeleteAccountSection } from "../account/delete-account-section.js";
import { initExportDataSection } from "../account/export-data-section.js";
import { initNameSection } from "../account/name-section.js";
import { initOtherSessionsSection } from "../account/other-sessions-section.js";
import { initPasskeySection } from "../account/passkey-section.js";
import { initPasswordSection } from "../account/password-section.js";
import { initPage, PAGE_ACCESS } from "../shared/page.js";
import { initPasswordToggles } from "../shared/password-toggle.js";

if (initPage(PAGE_ACCESS.SIGNED_IN)) {
  initPasswordToggles();

  initAccountHeader();
  initPasswordSection();
  initOtherSessionsSection();
  initExportDataSection();
  initDeleteAccountSection();

  // Each waits on the backend, so they load side by side.
  await Promise.all([initNameSection(), initPasskeySection()]);
}
